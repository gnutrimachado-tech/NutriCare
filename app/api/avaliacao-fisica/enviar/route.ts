// app/api/avaliacao-fisica/enviar/route.ts
//
// POST: gera o PDF da Avaliação Física e envia ao paciente via Brevo
// (mesmo arquivo que o botão "Download do PDF" baixa).
//
// Body esperado:
//   {
//     pacienteId: string,
//     sexo: "M" | "F",                // derivado do cadastro
//     idade: number,
//     alturaCm: number,
//     pesoKg: number,
//     bodyFatPct:  number | null,     // calculado na tela de Antropometria
//     massaMuscularKg: number | null, // "massa magra" = peso - massa gorda
//     massaAdiposaKg: number | null,  // = peso * BF%
//     aguaPct: number | null,         // Watson
//   }
//
// IMPORTANTE: NÃO usa JSX aqui (Turbopack recusa JSX em arquivos .ts),
// então o componente React é montado via React.createElement.

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { resumoCompleto } from "@/lib/bodyComposition";
import { sendBrevoEmail, bufferToBase64 } from "@/lib/brevoEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const pacienteId = body?.pacienteId;
    if (!pacienteId) {
      return NextResponse.json({ ok: false, erro: "pacienteId ausente" }, { status: 400 });
    }

    // 1) Buscar paciente (nome, email, sexo, dt nascimento)
    const paciente = await prisma.pacientes.findUnique({ where: { id: pacienteId } });
    if (!paciente) {
      return NextResponse.json({ ok: false, erro: "Paciente não encontrado" }, { status: 404 });
    }

    // 2) Buscar nutricionista logado (CRN + nome + email)
    const session = await getServerSession(authOptions).catch(() => null);
    const sessionNutri: any = (session as any)?.user ?? {};
    let nutricionista: { nome: string; crn: string; email?: string } = {
      nome: sessionNutri?.name || "Nutricionista",
      crn: sessionNutri?.crn || "—",
      email: sessionNutri?.email,
    };
    if (!sessionNutri?.crn && nutricionista.email) {
      const nutriRow = await prisma.nutricionistas
        .findUnique({ where: { email: nutricionista.email } })
        .catch(() => null);
      if (nutriRow) {
        nutricionista = { nome: nutriRow.nome, crn: nutriRow.crn || "—", email: nutriRow.email };
      }
    }

    // 3) Montar o resumo (tabelas + seleção de imagem + classificação de água)
    const resumo = resumoCompleto({
      pesoKg: Number(body.pesoKg) || 0,
      alturaCm: Number(body.alturaCm) || 0,
      idade: Number(body.idade) || 0,
      sexo: (body.sex === "F" || body.sex === "feminino") ? "F" : "M",
      pctAgua: Number(body.aguaPct) || 0,
      massaMagraKg: Number(body.massaMuscularKg) || 0,
      massaGordaKg: Number(body.massaAdiposaKg) || 0,
      bfPct: Number(body.bodyFatPct) || 0,
    });

    // 4) Gerar PDF via @react-pdf/renderer
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
        sexo: (body.sex === "F" || body.sex === "feminino") ? "F" : "M",
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

    // 5) Enviar via Brevo
    const html = `
      <p>Olá <strong>${esc(paciente.nome)}</strong>,</p>
      <p>Segue em anexo sua <strong>Avaliação Física</strong>.</p>
      <p>Resumo:<br/>
      • IMME: <strong>${resumo.imme.toFixed(2)} kg/m²</strong> (${esc(resumo.classificacoes.imme.label)})<br/>
      • IMG:  <strong>${resumo.img.toFixed(2)} kg/m²</strong> (${esc(resumo.classificacoes.img.label)})<br/>
      • FFMI: <strong>${resumo.ffmi.toFixed(2)} kg/m²</strong><br/>
      • % Gordura: <strong>${resumo.bfPct.toFixed(1)}%</strong><br/>
      • % Água: <strong>${resumo.pctAgua.toFixed(1)}%</strong> (${esc(resumo.classificacoes.agua.label)})</p>
      <p>Em caso de dúvidas, entre em contato com seu nutricionista.</p>
      <p>${esc(nutricionista.nome)} · CRN ${esc(nutricionista.crn)}</p>
    `;

    const slug = slugify(paciente.nome);

    const destino = paciente.email;
    if (!destino) {
      return NextResponse.json(
        { ok: false, erro: "Paciente sem e-mail cadastrado" },
        { status: 400 }
      );
    }

    await sendBrevoEmail({
      to: [{ email: destino, name: paciente.nome }],
      subject: `Sua Avaliação Física — ${paciente.nome}`,
      html,
      text:
        `Olá ${paciente.nome}, segue em anexo sua Avaliação Física.\n\n` +
        `IMME: ${resumo.imme.toFixed(2)} kg/m²\n` +
        `IMG:  ${resumo.img.toFixed(2)} kg/m²\n` +
        `FFMI: ${resumo.ffmi.toFixed(2)} kg/m²\n` +
        `% Gordura: ${resumo.bfPct.toFixed(1)}%\n` +
        `% Água: ${resumo.pctAgua.toFixed(1)}%\n`,
      attachments: [
        { name: `avaliacao-${slug}.pdf`, contentBase64: bufferToBase64(buffer) },
      ],
      replyTo: nutricionista.email
        ? { email: nutricionista.email, name: nutricionista.nome }
        : undefined,
    });

    return NextResponse.json({ ok: true, mensagem: "Avaliação enviada com sucesso", resumo });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro desconhecido" },
      { status: 500 }
    );
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
