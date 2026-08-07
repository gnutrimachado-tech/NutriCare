import { NextRequest, NextResponse } from "next/server";
import { salvarAvaliacaoHistorico } from "@/lib/avaliacaoHistorico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      return NextResponse.json(
        { ok: false, erro: "pacienteId ausente" },
        { status: 400 }
      );
    }

    const snapshot = await salvarAvaliacaoHistorico({
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

    return NextResponse.json({ ok: true, snapshot });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro ao salvar a avaliação" },
      { status: 500 }
    );
  }
}
