import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type MailboxObject = {
  Address?: string;
  address?: string;
  Email?: string;
  email?: string;
  Name?: string;
  name?: string;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractAddresses(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractAddresses(item));
  }

  if (typeof value === "string") {
    return [value];
  }

  if (typeof value === "object") {
    const mailbox = value as MailboxObject;
    return [mailbox.Address, mailbox.address, mailbox.Email, mailbox.email].filter(
      (item): item is string => Boolean(item)
    );
  }

  return [];
}

function extractToken(addresses: string[]): string | null {
  for (const address of addresses) {
    const match = address.match(/\+([a-f0-9]{64})@/i);
    if (match) return match[1];
  }
  return null;
}

function firstMeaningfulLine(value: string): string {
  const lines = value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(">"));

  return lines.slice(0, 3).join(" ").trim();
}

function detectStatusFromReply(value: string): "Confirmado" | "Recusado" | null {
  const text = normalizeText(firstMeaningfulLine(value));

  if (!text) return null;

  if (/\b(sim|confirmo|confirmada|confirmado|confirmar)\b/.test(text)) {
    return "Confirmado";
  }

  if (/\b(nao|recuso|recusado|recusada|cancelo|cancelar)\b/.test(text)) {
    return "Recusado";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.BREVO_INBOUND_SECRET;
    const url = new URL(req.url);
    const providedSecret = req.headers.get("x-brevo-inbound-secret") || url.searchParams.get("secret");

    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const addresses = [
      ...extractAddresses(body?.To),
      ...extractAddresses(body?.Recipients),
      ...extractAddresses(body?.Cc),
    ];

    const token = extractToken(addresses);
    if (!token) {
      return NextResponse.json({ error: "Token não encontrado no destinatário" }, { status: 400 });
    }

    const rawMessage =
      body?.ExtractedMarkdownMessage ||
      body?.RawTextBody ||
      body?.TextBody ||
      "";

    const novoStatus = detectStatusFromReply(String(rawMessage));
    if (!novoStatus) {
      return NextResponse.json({ ok: false, ignored: true, reason: "Resposta não reconhecida" });
    }

    const agendamento = await prisma.agendamentos.findUnique({
      where: { confirmation_token: token },
    });

    if (!agendamento) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    await prisma.agendamentos.update({
      where: { id: agendamento.id },
      data: { status: novoStatus },
    });

    return NextResponse.json({ ok: true, status: novoStatus, agendamento_id: agendamento.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar resposta do e-mail" },
      { status: 500 }
    );
  }
}
