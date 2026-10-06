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
  obterMassaMuscularHistorica,
} from "@/lib/avaliacaoHistorico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtData(d: Date | string | null | undefined) {
  if (!d) return "";
  const texto = d instanceof Date ? d.toISOString() : String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [yyyy, mm, dd] = texto.slice(0, 10).split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
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

    const [rows, paciente] = await Promise.all([
      listarUltimasTresAvaliacoes(pacienteId),
      prisma.pacientes.findUnique({
        where: { id: pacienteId },
        select: { altura_cm: true },
      }),
    ]);
    const alturaCm = Number(paciente?.altura_cm ?? 0);
    const avaliacoes = rows.map((r) => {
      const snap = extrairSnapshotDeEvolucao(r);
      const massaMuscularKg = obterMassaMuscularHistorica(
        snap,
        r.massa_muscular,
        alturaCm
      );
      const dataAvaliacao = snap?.dataAvaliacao || r.data_avaliacao || r.created_at;
      return {
        id: r.id,
        createdAt: r.created_at?.toISOString?.() || null,
        dataLabel: fmtData(dataAvaliacao),
        resumo: snap?.resumo
          ? {
              ...snap.resumo,
              massaMuscularKg,
              massaMuscularEsqueleticaKg: massaMuscularKg,
              massaLivreGorduraKg:
                snap.resumo.massaLivreGorduraKg ?? snap.resumo.massaMuscularKg,
            }
          : {
          pesoKg: Number(r.peso ?? 0) || null,
          bodyFatPct: Number(r.percentual_gordura ?? 0) || null,
          massaMuscularKg,
          massaMuscularEsqueleticaKg: massaMuscularKg,
          massaLivreGorduraKg: null,
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
    massaMuscularEsqueleticaKg?: number | null;
    massaLivreGorduraKg?: number | null;
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
        massaMuscularEsqueleticaKg:
          body.resumo?.massaMuscularEsqueleticaKg ?? body.resumo?.massaMuscularKg ?? null,
        massaLivreGorduraKg: body.resumo?.massaLivreGorduraKg ?? null,
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
