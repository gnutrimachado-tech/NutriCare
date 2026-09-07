// app/api/avaliacao-fisica/salvar/route.ts
// Botão "Salvar avaliação" (abas Antropometria e Anamnese).
// Grava a avaliação no histórico ROTATIVO 1ª / 2ª / 3ª (regra já existente
// em lib/avaliacaoHistorico.ts):
//   - 1º clique em salvar -> 1ª avaliação (fica fixa para sempre)
//   - 2º clique -> 2ª avaliação
//   - 3º clique -> 3ª avaliação (mais recente)
//   - 4º clique em diante -> a antiga 3ª desce para 2ª e a nova vira a
//     "mais recente" (3ª), sempre mantendo 3 registros.
// Não gera PDF nem envia e-mail — apenas persiste e devolve o número da
// avaliação para o front exibir.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { salvarAvaliacaoHistorico } from "@/lib/avaliacaoHistorico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BodyShape = {
  pacienteId?: string;
  dataAvaliacao?: string | null;
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

function algumPositivo(values?: Record<string, number>) {
  return Object.values(values || {}).some((v) => Number(v) > 0);
}

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

    // Não grava avaliação vazia: exige ao menos uma medida ou um valor de resumo.
    const temMedidas =
      algumPositivo(body.currentDobras) || algumPositivo(body.currentCircunferencias);
    const temResumo = [
      body.resumo?.pesoKg,
      body.resumo?.bodyFatPct,
      body.resumo?.massaMuscularKg,
    ].some((v) => typeof v === "number" && Number.isFinite(v) && v > 0);

    if (!temMedidas && !temResumo) {
      return NextResponse.json(
        { ok: false, erro: "Nenhum valor informado para salvar a avaliação." },
        { status: 400 }
      );
    }

    // Número da avaliação = total já salvo + 1, travado em 3 (a "mais recente").
    const totalAntes = await prisma.evolucao_corporal.count({
      where: { paciente_id: pacienteId },
    });
    const numeroAvaliacao = Math.min(totalAntes + 1, 3);

    const salvo = await salvarAvaliacaoHistorico({
      pacienteId,
      dataAvaliacao: body.dataAvaliacao || null,
      protocolLabel: body.protocolLabel || "",
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

    return NextResponse.json({
      ok: true,
      id: salvo.id,
      numeroAvaliacao,
      totalAvaliacoes: totalAntes + 1,
      dataAvaliacao: salvo.snapshot.dataAvaliacao || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro ao salvar avaliação" },
      { status: 500 }
    );
  }
}
