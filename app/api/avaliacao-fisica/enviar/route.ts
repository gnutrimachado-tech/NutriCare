// app/api/avaliacao-fisica/enviar/route.ts
// Botão "Enviar avaliação física" — SÓ ENVIA por e-mail (Brevo).
// NÃO salva no histórico (isso só acontece no /download).

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
import { sendBrevoEmail, bufferToBase64 } from "@/lib/brevoEmail";
import {
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
    let nutricionista: { nome: string; crn: string; email?: string } = {
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

    // Evolução: 1ª (fixa) + 2ª + 3ª = ATUAL (ainda não gravada porque envio não salva).
    const rotativas = await listarUltimasTresAvaliacoes(pacienteId);
    const evolucaoBanco = rotativas.map((r) => {
      const snap = extrairSnapshotDeEvolucao(r);
      return {
        data: fmtData(r.created_at),
        peso: snap?.resumo.pesoKg ?? (Number(r.peso ?? 0) || null),
        massaMuscular: snap?.resumo.massaMuscularKg ?? (Number(r.massa_muscular ?? 0) || null),
        bfPct: snap?.resumo.bodyFatPct ?? (Number(r.percentual_gordura ?? 0) || null),
      };
    });
    // Mesma lista com o id de cada avaliação — alimenta as caixas de seleção
    const evolucaoHistorico = rotativas.map((r) => {
      const snap = extrairSnapshotDeEvolucao(r);
      return {
        id: r.id,
        data: fmtData(r.created_at),
        peso: snap?.resumo.pesoKg ?? (Number(r.peso ?? 0) || null),
        massaMuscular: snap?.resumo.massaMuscularKg ?? (Number(r.massa_muscular ?? 0) || null),
        bfPct: snap?.resumo.bodyFatPct ?? (Number(r.percentual_gordura ?? 0) || null),
      };
    });

    // Acrescenta o ponto ATUAL (envio de hoje) no final, sem persistir.
    const hoje = new Date();
    const atualPonto = {
      data: fmtData(hoje),
      peso: resumo.pesoKg,
      massaMuscular: resumo.massaMagraKg,
      bfPct: resumo.bfPct,
    };

    // Mantém no máx. 3 pontos preservando a 1ª:
    let evolucao = [...evolucaoBanco, atualPonto];
    if (evolucao.length > 3) {
      const first = evolucao[0];
      const lastTwo = evolucao.slice(-2);
      evolucao = [first, ...lastTwo];
    }

    const primeira = await primeiraAvaliacao(pacienteId);
    const primeiraSnap = primeira ? extrairSnapshotDeEvolucao(primeira) : null;
    const dataAvaliacaoInicial = primeira?.created_at?.toISOString?.() || null;

    // Imagem do biotipo pela regra FFMI + BF%
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
        previousSummary: primeiraSnap
          ? {
              pesoKg: primeiraSnap.resumo.pesoKg,
              bodyFatPct: primeiraSnap.resumo.bodyFatPct,
              massaMuscularKg: primeiraSnap.resumo.massaMuscularKg,
              massaAdiposaKg: primeiraSnap.resumo.massaAdiposaKg,
              aguaPct: primeiraSnap.resumo.aguaPct,
              imme: primeiraSnap.resumo.imme,
              img: primeiraSnap.resumo.img,
              ffmi: primeiraSnap.resumo.ffmi,
              createdAt: primeira?.created_at?.toISOString?.() || null,
              protocolLabel: primeiraSnap.resumo.protocolLabel || "",
            }
          : null,
        evolucao,
        evolucaoHistorico,
        evolucaoSelecionadaIds: Array.isArray(body.evolucaoSelecionadaIds)
          ? body.evolucaoSelecionadaIds
          : [],
        evolucaoAtual: atualPonto,
        dataAvaliacaoInicial,
      },
      nutricionista,
    });

    const buffer = await renderToBuffer(doc);

    const destino = paciente.email;
    if (!destino) {
      return NextResponse.json({ ok: false, erro: "Paciente sem e-mail cadastrado" }, { status: 400 });
    }

    const slug = slugify(paciente.nome);

    // Mesmo padrão visual do e-mail de plano alimentar / orientações /
    // lista de compras: card azul com a logo NutriCare no topo.
    const rawBase =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      req.headers.get("origin") ||
      "http://localhost:3000";
    const baseUrl = String(rawBase).replace(/\/+$/, "");
    const logoUrl = `${baseUrl}/logo-nutricare.png`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#eef3f8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe3ec;">
    <div style="padding:24px 28px;background:linear-gradient(180deg, #3f6faa 0%, #265d99 45%, #183865 100%);color:#ffffff;text-align:center;">
      <img src="${logoUrl}" alt="NutriCare" style="display:block;margin:0 auto 10px;max-width:200px;height:auto;" />
      <div style="font-size:16px;font-weight:600;margin-top:4px;">Avaliação física enviada para download</div>
      <div style="font-size:13px;line-height:1.7;margin-top:8px;color:#dbe8f7;">
        Paciente: ${esc(paciente.nome)}
      </div>
    </div>

    <div style="margin:18px 28px 0;padding:16px 18px;border:1px solid #d7e3ef;border-radius:12px;background:#f8fbff;">
      <div style="font-size:13px;line-height:1.7;color:#334155;">
        Olá <strong>${esc(paciente.nome)}</strong>, segue em anexo sua <strong>Avaliação Física</strong>.
      </div>
    </div>

    <div style="margin:18px 28px 28px;padding:16px 18px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
      <div style="font-size:15px;font-weight:700;color:#166534;margin-bottom:8px;">Resumo principal</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.8;color:#166534;">
        <li>Peso: <strong>${resumo.pesoKg.toFixed(1).replace(".", ",")} kg</strong></li>
        <li>Músculo Esquelético: <strong>${resumo.imme.toFixed(2).replace(".", ",")} kg/m²</strong> (${esc(resumo.classificacoes.imme.label)})</li>
        <li>Índice de Massa Gorda: <strong>${resumo.img.toFixed(2).replace(".", ",")} kg/m²</strong> (${esc(resumo.classificacoes.img.label)})</li>
        <li>Massa Livre de Gordura: <strong>${resumo.ffmi.toFixed(2).replace(".", ",")} kg/m²</strong></li>
        <li>% de Gordura: <strong>${resumo.bfPct.toFixed(1).replace(".", ",")}%</strong> (${esc(resumo.classificacoes.gordura.label)})</li>
        <li>% de Água corporal: <strong>${resumo.pctAgua.toFixed(1).replace(".", ",")}%</strong> (${esc(resumo.classificacoes.agua.label)})</li>
      </ul>
    </div>

    <div style="margin:0 28px 28px;font-size:12px;line-height:1.7;color:#64748b;">
      Em caso de dúvidas, entre em contato com seu nutricionista.<br/>
      ${esc(nutricionista.nome)} · CRN ${esc(nutricionista.crn)}
    </div>
  </div>
</body>
</html>`;

    await sendBrevoEmail({
      to: [{ email: destino, name: paciente.nome }],
      subject: `Sua Avaliação Física — ${paciente.nome}`,
      html,
      text:
        `Olá ${paciente.nome}, segue em anexo sua Avaliação Física.\n\n` +
        `Peso: ${resumo.pesoKg.toFixed(1)} kg\n` +
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

    // IMPORTANTE: aqui NÃO chamamos salvarAvaliacaoHistorico.
    // O envio não persiste no histórico (regra do produto).
    return NextResponse.json({ ok: true, mensagem: "Avaliação enviada com sucesso", resumo, destino });
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
