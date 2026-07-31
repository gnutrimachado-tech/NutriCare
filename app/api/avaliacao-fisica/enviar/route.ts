// app/api/avaliacao-fisica/enviar/route.ts
// POST: gera PDF da avaliação com @react-pdf/renderer e envia ao paciente via Brevo.
// É a mesma rota usada pelo botão "Enviar Avaliação Física" na aba Antropometria.
//
// Body esperado (JSON):
// {
//   paciente: { nome, email, sexo: "M"|"F", idade, dataNascimento?, altura_cm? },
//   avaliacao: {
//     data, pesoKg, alturaM, pctAgua, massaMagraKg, massaGordaKg,
//     bfPct, massaMuscularEsqueleticaKg, massaLivreGorduraKg,
//     taxaMetabolicaBasal?, circunferencias?, dobras?
//   },
//   nutricionista: { nome, crn, email? }
// }

import { NextRequest, NextResponse } from "next/server";
import { resumoCompleto } from "@/lib/bodyComposition";
import { sendBrevoEmail, bufferToBase64 } from "@/lib/brevoEmail";

export const runtime = "nodejs"; // necessário para @react-pdf/renderer
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const erros: string[] = [];
    if (!body?.paciente?.email) erros.push("paciente.email ausente");
    if (!body?.paciente?.nome) erros.push("paciente.nome ausente");
    if (!body?.paciente?.sexo) erros.push("paciente.sexo ausente");
    if (!body?.avaliacao?.alturaM) erros.push("avaliacao.alturaM ausente");
    if (!body?.avaliacao?.pesoKg) erros.push("avaliacao.pesoKg ausente");
    if (erros.length) {
      return NextResponse.json({ ok: false, erros }, { status: 400 });
    }

    const { paciente, avaliacao, nutricionista } = body;
    const r = resumoCompleto({
      pesoKg: avaliacao.pesoKg,
      alturaM: avaliacao.alturaM,
      idade: paciente.idade ?? avaliacao.idade,
      sexo: paciente.sexo,
      pctAgua: avaliacao.pctAgua,
      massaMagraKg: avaliacao.massaMagraKg,
      massaGordaKg: avaliacao.massaGordaKg,
      bfPct: avaliacao.bfPct,
      massaMuscularEsqueleticaKg: avaliacao.massaMuscularEsqueleticaKg,
      massaLivreGorduraKg: avaliacao.massaLivreGorduraKg,
    });

    // Import dinâmico para que a build NÃO falhe se @react-pdf/renderer
    // ainda não tiver sido instalado. Depois de `npm i @react-pdf/renderer`
    // o dynamic import passa a funcionar normalmente.
    // @ts-ignore - resolvido em runtime
    const mod = await import("@react-pdf/renderer").catch(() => null);
    if (!mod) {
      return NextResponse.json(
        {
          ok: false,
          erro:
            "@react-pdf/renderer não instalado. Rode: npm i @react-pdf/renderer",
        },
        { status: 500 }
      );
    }
    const { renderToBuffer } = mod as any;

    const { AvaliacaoPdfDocument } = await import("@/lib/avaliacaoPdf").catch(
      () => ({ AvaliacaoPdfDocument: null } as any)
    );
    if (!AvaliacaoPdfDocument) {
      return NextResponse.json(
        { ok: false, erro: "lib/avaliacaoPdf não encontrada." },
        { status: 500 }
      );
    }

    const legendaImagem =
      r.imagem.codigo === 3
        ? "Excelente composição corporal"
        : r.imagem.codigo === 1
        ? "Composição corporal equilibrada"
        : "Atenção: reavalie massa muscular e/ou gordura corporal";

    const doc = (
      <AvaliacaoPdfDocument
        paciente={paciente}
        dados={{
          data: avaliacao.data ?? new Date().toLocaleDateString("pt-BR"),
          pesoKg: avaliacao.pesoKg,
          alturaM: avaliacao.alturaM,
          pctAgua: r.pctAgua,
          massaMagraKg: avaliacao.massaMagraKg,
          massaGordaKg: avaliacao.massaGordaKg,
          bfPct: r.bfPct,
          massaMuscularEsqueleticaKg: avaliacao.massaMuscularEsqueleticaKg,
          massaLivreGorduraKg: avaliacao.massaLivreGorduraKg,
          taxaMetabolicaBasal: avaliacao.taxaMetabolicaBasal,
          imme: r.imme,
          img: r.img,
          ffmi: r.ffmi,
          classificacaoAgua: r.classificacoes.agua,
          classificacaoImme: r.classificacoes.imme,
          classificacaoImg: r.classificacoes.img,
          imagemUrl: r.imagem.url,
          legendaImagem,
        }}
        circunferencias={avaliacao.circunferencias}
        dobras={avaliacao.dobras}
        nutricionista={nutricionista ?? { nome: "Nutricionista", crn: "—" }}
      />
    );

    const buffer = await renderToBuffer(doc);

    const html = `
      <p>Olá <strong>${escape(paciente.nome)}</strong>,</p>
      <p>Segue em anexo sua <strong>Avaliação Física</strong>, gerada em ${escape(
        avaliacao.data ?? new Date().toLocaleDateString("pt-BR")
      )}.</p>
      <p>Resumo:<br/>
      • IMME: <strong>${r.imme.toFixed(2)} kg/m²</strong> (${escape(r.classificacoes.imme.label)})<br/>
      • IMG: <strong>${r.img.toFixed(2)} kg/m²</strong> (${escape(r.classificacoes.img.label)})<br/>
      • FFMI: <strong>${r.ffmi.toFixed(2)} kg/m²</strong><br/>
      • % de Gordura: <strong>${r.bfPct.toFixed(1)}%</strong></p>
      <p>Em caso de dúvidas, entre em contato com seu nutricionista.</p>
      <p>${escape(nutricionista?.nome ?? "")} · CRN ${escape(nutricionista?.crn ?? "")}</p>
    `;

    await sendBrevoEmail({
      to: [{ email: paciente.email, name: paciente.nome }],
      subject: `Sua Avaliação Física — ${paciente.nome}`,
      html,
      text:
        `Olá ${paciente.nome}, segue em anexo sua Avaliação Física.\n\n` +
        `IMME: ${r.imme.toFixed(2)} kg/m²\n` +
        `IMG: ${r.img.toFixed(2)} kg/m²\n` +
        `FFMI: ${r.ffmi.toFixed(2)} kg/m²\n` +
        `% Gordura: ${r.bfPct.toFixed(1)}%\n`,
      attachments: [
        {
          name: `avaliacao-${slug(paciente.nome)}.pdf`,
          contentBase64: bufferToBase64(buffer),
        },
      ],
      replyTo: nutricionista?.email
        ? { email: nutricionista.email, name: nutricionista.nome }
        : undefined,
    });

    return NextResponse.json({
      ok: true,
      mensagem: "Avaliação enviada com sucesso.",
      resumo: r,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: e?.message ?? "Erro desconhecido" },
      { status: 500 }
    );
  }
}

function escape(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]
  );
}
function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
