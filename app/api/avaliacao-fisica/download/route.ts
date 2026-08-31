// app/api/avaliacao-fisica/download/route.ts
// Botão "Download do PDF" — gera o PDF, DEVOLVE para download e
// TAMBÉM salva no histórico (regra do produto: histórico só grava
// quando o nutri baixa; envio por e-mail sozinho não salva).

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  resumoCompleto,
  imagemFrontalUrl,
  imagemLateralUrl,
} from "@/lib/bodyComposition";
import {
  salvarAvaliacaoHistorico,
  listarUltimasTresAvaliacoes,
  primeiraAvaliacao,
  extrairSnapshotDeEvolucao,
} from "@/lib/avaliacaoHistorico";

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
  protocolLabel?: string;
  compareResults?: boolean;
  currentDobras?: Record<string, number>;
  currentCircunferencias?: Record<string, number>;
  previousDobras?: Record<string, number>;
  previousCircunferencias?: Record<string, number>;
  // Ids das avaliações (1ª/2ª/3ª) marcadas nas caixas de seleção da aba Antropometria
  evolucaoSelecionadaIds?: string[];
};

function fmtData(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
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

    const session = await getServerSession(authOptions).catch(() => null);
    const sessionNutri: any = (session as any)?.user ?? {};
    let nutricionista = {
      nome: sessionNutri?.name || "Nutricionista",
      crn: sessionNutri?.crn || "—",
      email: sessionNutri?.email,
    };
    if (!sessionNutri?.crn && nutricionista.email) {
      const nutriRow = await prisma.nutricionistas
        .findUnique({ where: { email: nutricionista.email } })
        .catch(() => null);
      if (nutriRow) nutricionista = { nome: nutriRow.nome, crn: nutriRow.crn || "—", email: nutriRow.email };
    }

    const sexo = body.sex === "F" || body.sex === "feminino" ? "F" : "M";

    const resumo = resumoCompleto({
      pesoKg: Number(body.pesoKg) || 0,
      alturaCm: Number(body.alturaCm) || 0,
      idade: Number(body.idade) || 0,
      sexo,
      pctAgua: Number(body.aguaPct) || 0,
      massaMagraKg: Number(body.massaMuscularKg) || 0,
      massaGordaKg: Number(body.massaAdiposaKg) || 0,
      bfPct: Number(body.bodyFatPct) || 0,
    });

    // ==============================
    // 1) SALVA no histórico ANTES de renderizar o PDF (rotação 1ª/2ª/3ª)
    // ==============================
    const registroAtual = await salvarAvaliacaoHistorico({
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
        protocolLabel: body.protocolLabel || "",
      },
    });

    // ==============================
    // 2) Monta evolução com os registros anteriores. O resultado atual já
    // será acrescentado pelo PDF como último ponto; não o duplica na série.
    // ==============================
    const rotativas = await listarUltimasTresAvaliacoes(pacienteId);
    const historicoAnterior = rotativas.filter((r) => r.id !== registroAtual.id);
    const criadoEmAtual = registroAtual.createdAt
      ? new Date(registroAtual.createdAt)
      : new Date();
    const evolucao = historicoAnterior.map((r) => {
      const snap = extrairSnapshotDeEvolucao(r);
      return {
        data: fmtData(r.created_at),
        peso: snap?.resumo.pesoKg ?? (Number(r.peso ?? 0) || null),
        massaMuscular: snap?.resumo.massaMuscularKg ?? (Number(r.massa_muscular ?? 0) || null),
        bfPct: snap?.resumo.bodyFatPct ?? (Number(r.percentual_gordura ?? 0) || null),
      };
    });
    const evolucaoAtual = {
      data: fmtData(criadoEmAtual),
      peso: resumo.pesoKg,
      massaMuscular: resumo.massaMagraKg,
      bfPct: resumo.bfPct,
    };
    // Mesma lista com o id de cada avaliação — alimenta as caixas de seleção
    const evolucaoHistorico = historicoAnterior.map((r) => {
      const snap = extrairSnapshotDeEvolucao(r);
      return {
        id: r.id,
        data: fmtData(r.created_at),
        createdAt: r.created_at?.toISOString?.() || null,
        peso: snap?.resumo.pesoKg ?? (Number(r.peso ?? 0) || null),
        massaMuscular: snap?.resumo.massaMuscularKg ?? (Number(r.massa_muscular ?? 0) || null),
        bfPct: snap?.resumo.bodyFatPct ?? (Number(r.percentual_gordura ?? 0) || null),
      };
    });

    const primeira = await primeiraAvaliacao(pacienteId);
    const anterior = historicoAnterior[historicoAnterior.length - 1] || null;
    const anteriorSnap = anterior ? extrairSnapshotDeEvolucao(anterior) : null;
    const dataAvaliacaoInicial = primeira?.created_at?.toISOString?.() || null;

    const imagemFrenteUrl = imagemFrontalUrl(sexo, resumo.imagem.codigo);
    const imagemLateralUrlV = imagemLateralUrl(sexo, resumo.imagem.codigo);

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

    const doc = React.createElement(AvaliacaoPdfDocument, {
      paciente: {
        nome: paciente.nome,
        sexo,
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
        classificacaoAgua: resumo.classificacoes.agua,
        classificacaoMassaMuscular: resumo.classificacoes.massaMuscular,
        classificacaoImme: resumo.classificacoes.imme,
        classificacaoMassaAdiposa: resumo.classificacoes.img,
        classificacaoImg: resumo.classificacoes.img,
        classificacaoFfmi: resumo.classificacoes.ffmi,
        classificacaoGordura: resumo.classificacoes.gordura,
        imagemFrenteUrl,
        imagemLateralUrl: imagemLateralUrlV,
        compareResults: Boolean(body.compareResults),
        currentDobras: body.currentDobras || {},
        currentCircunferencias: body.currentCircunferencias || {},
        previousDobras: body.previousDobras || {},
        previousCircunferencias: body.previousCircunferencias || {},
        previousSummary: anteriorSnap
          ? {
              pesoKg: anteriorSnap.resumo.pesoKg,
              bodyFatPct: anteriorSnap.resumo.bodyFatPct,
              massaMuscularKg: anteriorSnap.resumo.massaMuscularKg,
              massaAdiposaKg: anteriorSnap.resumo.massaAdiposaKg,
              aguaPct: anteriorSnap.resumo.aguaPct,
              imme: anteriorSnap.resumo.imme,
              img: anteriorSnap.resumo.img,
              ffmi: anteriorSnap.resumo.ffmi,
              createdAt: anterior?.created_at?.toISOString?.() || null,
              protocolLabel: anteriorSnap.resumo.protocolLabel || "",
            }
          : null,
        evolucao,
        evolucaoHistorico,
        evolucaoSelecionadaIds: Array.isArray(body.evolucaoSelecionadaIds)
          ? body.evolucaoSelecionadaIds
          : [],
        evolucaoAtual,
        evolucaoAtualId: registroAtual.id,
        dataAvaliacaoInicial,
      },
      nutricionista,
    });

    const buffer = await renderToBuffer(doc);
    const slug = slugify(paciente.nome);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="avaliacao-${slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: e?.message ?? "Erro" }, { status: 500 });
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
