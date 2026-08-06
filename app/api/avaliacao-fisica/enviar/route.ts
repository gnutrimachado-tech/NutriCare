import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { resumoCompleto } from "@/lib/bodyComposition";
import { salvarAvaliacaoHistorico } from "@/lib/avaliacaoHistorico";
import { sendBrevoEmail, bufferToBase64 } from "@/lib/brevoEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BodyShape = {
  pacienteId?: string;
  sex?: "M" | "F" | string;
  idade?: number;
  alturaCm?: number;
  pesoKg?: number;
  bodyFatPct?: number | null;
  massaMuscularKg?: number | null;
  massaAdiposaKg?: number | null;
  aguaPct?: number | null;
  vo2max?: number | null;
  protocolLabel?: string;
  compareResults?: boolean;
  currentDobras?: Record<string, number>;
  currentCircunferencias?: Record<string, number>;
  previousDobras?: Record<string, number>;
  previousCircunferencias?: Record<string, number>;
  previousSummary?: {
    pesoKg?: number | null;
    bodyFatPct?: number | null;
    massaMuscularKg?: number | null;
    massaAdiposaKg?: number | null;
    aguaPct?: number | null;
  vo2max?: number | null;
    imme?: number | null;
    img?: number | null;
    ffmi?: number | null;
    createdAt?: string | null;
    protocolLabel?: string | null;
  } | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyShape;

    const pacienteId = body?.pacienteId;
    if (!pacienteId) {
      return NextResponse.json({ ok: false, erro: "pacienteId ausente" }, { status: 400 });
    }

    const paciente = await prisma.pacientes.findUnique({ where: { id: pacienteId } });
    if (!paciente) {
      return NextResponse.json({ ok: false, erro: "Paciente não encontrado" }, { status: 404 });
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const sessionNutri: any = (session as any)?.user ?? {};
    let nutricionista: { nome: string; crn: string; email?: string } = {
      nome: sessionNutri?.name || "Nutricionista",
      crn: sessionNutri?.crn || "—",
      email: sessionNutri?.email,
    };

    if (!sessionNutri?.crn && nutricionista.email) {
      const nutriRow = await prisma.nutricionistas.findUnique({ where: { email: nutricionista.email } }).catch(() => null);
      if (nutriRow) {
        nutricionista = { nome: nutriRow.nome, crn: nutriRow.crn || "—", email: nutriRow.email };
      }
    }

    const resumo = resumoCompleto({
      pesoKg: Number(body.pesoKg) || 0,
      alturaCm: Number(body.alturaCm) || 0,
      idade: Number(body.idade) || 0,
      sexo: body.sex === "F" || body.sex === "feminino" ? "F" : "M",
      pctAgua: Number(body.aguaPct) || 0,
      massaMagraKg: Number(body.massaMuscularKg) || 0,
      massaGordaKg: Number(body.massaAdiposaKg) || 0,
      bfPct: Number(body.bodyFatPct) || 0,
    });

    const mod = await import("@react-pdf/renderer").catch(() => null);
    if (!mod) {
      return NextResponse.json(
        { ok: false, erro: "Instale @react-pdf/renderer (npm i @react-pdf/renderer)" },
        { status: 500 }
      );
    }
    const { renderToBuffer } = mod as any;

    const pdfMod = await import("@/lib/avaliacaoPdf").catch(() => null as any);
    if (!pdfMod?.AvaliacaoPdfDocument) {
      return NextResponse.json({ ok: false, erro: "lib/avaliacaoPdf não encontrada" }, { status: 500 });
    }
    const { AvaliacaoPdfDocument } = pdfMod;

    const legendaImagem =
      resumo.imagem.codigo === 3
        ? "Excelente composição corporal"
        : resumo.imagem.codigo === 1
        ? "Composição corporal equilibrada"
        : "Atenção: reavalie massa muscular e/ou gordura corporal";

    const doc = React.createElement(AvaliacaoPdfDocument, {
      paciente: {
        nome: paciente.nome,
        sexo: body.sex === "F" || body.sex === "feminino" ? "F" : "M",
        idade: Number(body.idade) || 0,
        altura_cm: Number(body.alturaCm) || 0,
        nascimento: paciente.data_nascimento ? new Date(paciente.data_nascimento).toISOString() : null,
      },
      dados: {
        data: new Date().toLocaleDateString("pt-BR"),
        pesoKg: resumo.pesoKg,
        pctAgua: resumo.pctAgua,
        massaMagraKg: resumo.massaMagraKg,
        massaGordaKg: resumo.massaGordaKg,
        bfPct: resumo.bfPct,
        imme: resumo.imme,
        img: resumo.img,
        ffmi: resumo.ffmi,
        vo2max: body.vo2max ?? null,
        classificacaoAgua: resumo.classificacoes.agua,
        classificacaoImme: resumo.classificacoes.imme,
        classificacaoImg: resumo.classificacoes.img,
        classificacaoFfmi: resumo.classificacoes.ffmi,
        classificacaoGordura: resumo.classificacoes.gordura,
        imagemUrl: resumo.imagem.url,
        imagemFrenteUrl: resumo.imagem.frontalUrl,
        imagemLateralUrl: resumo.imagem.lateralUrl,
        legendaImagem,
        protocolLabel: body.protocolLabel || "",
        compareResults: Boolean(body.compareResults),
        currentDobras: body.currentDobras || {},
        currentCircunferencias: body.currentCircunferencias || {},
        previousDobras: body.previousDobras || {},
        previousCircunferencias: body.previousCircunferencias || {},
        previousSummary: body.previousSummary || null,
      },
      nutricionista,
    });

    const buffer = await renderToBuffer(doc);

    const destino = paciente.email;
    if (!destino) {
      return NextResponse.json({ ok: false, erro: "Paciente sem e-mail cadastrado" }, { status: 400 });
    }

    const slug = slugify(paciente.nome);
    const html = `
      <p>Olá <strong>${esc(paciente.nome)}</strong>,</p>
      <p>Segue em anexo sua <strong>Avaliação Física</strong>.</p>
      <p><strong>Resumo principal</strong><br/>
      • Músculo Esquelético: <strong>${resumo.imme.toFixed(2)} kg/m²</strong> (${esc(resumo.classificacoes.imme.label)})<br/>
      • Índice de Massa Gorda: <strong>${resumo.img.toFixed(2)} kg/m²</strong> (${esc(resumo.classificacoes.img.label)})<br/>
      • Massa Livre de Gordura: <strong>${resumo.ffmi.toFixed(2)} kg/m²</strong><br/>
      • % de Gordura: <strong>${resumo.bfPct.toFixed(1)}%</strong><br/>
      • % de Água corporal: <strong>${resumo.pctAgua.toFixed(1)}%</strong> (${esc(resumo.classificacoes.agua.label)})</p>
      <p>Em caso de dúvidas, entre em contato com seu nutricionista.</p>
      <p>${esc(nutricionista.nome)} · CRN ${esc(nutricionista.crn)}</p>
    `;

    const emailResp = await sendBrevoEmail({
      to: [{ email: destino, name: paciente.nome }],
      subject: `Sua Avaliação Física — ${paciente.nome}`,
      html,
      text:
        `Olá ${paciente.nome}, segue em anexo sua Avaliação Física.\n\n` +
        `Músculo Esquelético: ${resumo.imme.toFixed(2)} kg/m²\n` +
        `Índice de Massa Gorda: ${resumo.img.toFixed(2)} kg/m²\n` +
        `Massa Livre de Gordura: ${resumo.ffmi.toFixed(2)} kg/m²\n` +
        `% de Gordura: ${resumo.bfPct.toFixed(1)}%\n` +
        `% de Água corporal: ${resumo.pctAgua.toFixed(1)}%\n`,
      attachments: [{ name: `avaliacao-${slug}.pdf`, content: bufferToBase64(buffer) }],
      replyTo: nutricionista.email
        ? { email: nutricionista.email, name: nutricionista.nome }
        : undefined,
    });

    const snapshot = await salvarAvaliacaoHistorico({
      pacienteId,
      protocolLabel: body.protocolLabel || "",
      currentDobras: body.currentDobras || {},
      currentCircunferencias: body.currentCircunferencias || {},
      resumo: {
        pesoKg: resumo.pesoKg,
        bodyFatPct: resumo.bfPct,
        massaMuscularKg: resumo.massaMagraKg,
        massaAdiposaKg: resumo.massaGordaKg,
        aguaPct: resumo.pctAgua,
        imme: resumo.imme,
        img: resumo.img,
        ffmi: resumo.ffmi,
      },
    });

    return NextResponse.json({ ok: true, mensagem: "Avaliação enviada com sucesso", resumo, destino, messageId: emailResp?.messageId ?? null, snapshot });
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: e?.message ?? "Erro desconhecido" }, { status: 500 });
  }
}

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
