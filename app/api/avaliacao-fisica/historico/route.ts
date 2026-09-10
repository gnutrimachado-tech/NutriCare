// app/api/avaliacao-fisica/historico/route.ts
// GET  -> retorna as até 3 avaliações (1ª fixa + 2ª + 3ª rotativas) do paciente
// POST -> mantido para compat., mas o histórico só é gravado no /download.
//         Aqui o POST apenas devolve o snapshot montado (dry-run) para o front.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildAvaliacaoSnapshot,
  extrairSnapshotDeEvolucao,
  listarUltimasTresAvaliacoes,
} from "@/lib/avaliacaoHistorico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtData(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pacienteId = url.searchParams.get("pacienteId");
    if (!pacienteId) {
      return NextResponse.json({ ok: false, erro: "pacienteId ausente" }, { status: 400 });
    }

    const rows = await listarUltimasTresAvaliacoes(pacienteId);
    const avaliacoes = rows.map((r) => {
      const snap = extrairSnapshotDeEvolucao(r);
      return {
        id: r.id,
        createdAt: r.created_at?.toISOString?.() || null,
        // Data REAL da avaliação (a que o nutri informou), não a de digitação.
        dataAvaliacao: snap?.dataAvaliacao || r.data_avaliacao?.toISOString?.() || null,
        dataLabel: fmtData(r.data_avaliacao || r.created_at),
        resumo: snap?.resumo || {
          pesoKg: Number(r.peso ?? 0) || null,
          bodyFatPct: Number(r.percentual_gordura ?? 0) || null,
          massaMuscularKg: Number(r.massa_muscular ?? 0) || null,
          massaAdiposaKg: null,
          aguaPct: null,
          imme: null,
          img: null,
          ffmi: null,
          createdAt: r.created_at?.toISOString?.() || null,
          protocolLabel: "",
        },
        dobras: snap?.dobras || {},
        circunferencias: snap?.circunferencias || {},
      };
    });

    return NextResponse.json({ ok: true, avaliacoes });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro ao consultar histórico" },
      { status: 500 }
    );
  }
}

type BodyShape = {
  pacienteId?: string;
  protocolLabel?: string;
  currentDobras?: Record<string, number>;
  currentCircunferencias?: Record<string, number>;
  resumo?: {
    pesoKg?: number | null;
    bodyFatPct?: number | null;
    massaMuscularKg?: number | null;
    massaAdiposaKg?: number | null;
    aguaPct?: number | null;
    imme?: number | null;
    img?: number | null;
    ffmi?: number | null;
    protocolLabel?: string | null;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyShape;
    if (!body?.pacienteId) {
      return NextResponse.json({ ok: false, erro: "pacienteId ausente" }, { status: 400 });
    }

    // Dry-run: monta o snapshot e devolve ao front SEM gravar.
    // O histórico só é persistido no fluxo do /download.
    const snapshot = buildAvaliacaoSnapshot({
      pacienteId: body.pacienteId,
      protocolLabel: body.protocolLabel || body.resumo?.protocolLabel || "",
      currentDobras: body.currentDobras || {},
      currentCircunferencias: body.currentCircunferencias || {},
      resumo: {
        pesoKg: body.resumo?.pesoKg ?? null,
        bodyFatPct: body.resumo?.bodyFatPct ?? null,
        massaMuscularKg: body.resumo?.massaMuscularKg ?? null,
        massaAdiposaKg: body.resumo?.massaAdiposaKg ?? null,
        aguaPct: body.resumo?.aguaPct ?? null,
        imme: body.resumo?.imme ?? null,
        img: body.resumo?.img ?? null,
        ffmi: body.resumo?.ffmi ?? null,
        protocolLabel: body.resumo?.protocolLabel || body.protocolLabel || "",
      },
    });

    return NextResponse.json({ ok: true, snapshot, persisted: false });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro ao montar snapshot" },
      { status: 500 }
    );
  }
}

// DELETE /api/avaliacao-fisica/historico?id=<evolucaoId>&pacienteId=<pacienteId>
// Apaga do banco (tabela evolucao_corporal) a avaliação salva, chamada pelo
// botão ✕ ao lado da caixa "Comparar com" na aba Antropometria.
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const pacienteId = url.searchParams.get("pacienteId");
    if (!id) {
      return NextResponse.json({ ok: false, erro: "id ausente" }, { status: 400 });
    }

    // Segurança: só apaga se o registro pertencer ao paciente informado.
    const registro = await prisma.evolucao_corporal.findUnique({ where: { id } });
    if (!registro || (pacienteId && registro.paciente_id !== pacienteId)) {
      return NextResponse.json({ ok: false, erro: "Avaliação não encontrada" }, { status: 404 });
    }

    await prisma.evolucao_corporal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro ao excluir avaliação" },
      { status: 500 }
    );
  }
}
