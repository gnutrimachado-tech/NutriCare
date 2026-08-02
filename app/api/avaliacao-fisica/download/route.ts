// app/api/avaliacao-fisica/download/route.ts
//
// POST: gera o MESMO PDF do /enviar e devolve como attachment.
// É o botão "Download do PDF" do nutricionista.
//
// IMPORTANTE: sem JSX inline (Turbopack não aceita em arquivos .ts).
// O componente React é montado via React.createElement.

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { resumoCompleto } from "@/lib/bodyComposition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
        classificacaoImme: resumo.classificacoes.imme,
        classificacaoImg: resumo.classificacoes.img,
        imagemUrl: resumo.imagem.url,
        legendaImagem,
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
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro" },
      { status: 500 }
    );
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
