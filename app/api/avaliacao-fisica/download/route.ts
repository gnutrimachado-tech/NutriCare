// app/api/avaliacao-fisica/download/route.ts
// GET: gera o MESMO PDF do envio e devolve como arquivo para o nutricionista.
// É a mesma rota usada pelo botão "Download do PDF" na aba Antropometria.
//
// Aceita query params (use-o ao chamar do client):
//   paciente   = JSON (mesma estrutura do /enviar)
//   avaliacao  = JSON
//   nutricionista = JSON
// OU recebe o mesmo payload do /enviar via POST se preferir.

import { NextRequest, NextResponse } from "next/server";
import { resumoCompleto } from "@/lib/bodyComposition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function gerarPdfBuffer(payload: any) {
  const { paciente, avaliacao, nutricionista } = payload;
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

  const mod = await import("@react-pdf/renderer").catch(() => null);
  if (!mod) {
    throw new Error(
      "@react-pdf/renderer não instalado. Rode: npm i @react-pdf/renderer"
    );
  }
  const { renderToBuffer } = mod as any;

  const { AvaliacaoPdfDocument } = await import("@/lib/avaliacaoPdf").catch(
    () => ({ AvaliacaoPdfDocument: null } as any)
  );
  if (!AvaliacaoPdfDocument) throw new Error("lib/avaliacaoPdf não encontrada.");

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

  return await renderToBuffer(doc);
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const buf = await gerarPdfBuffer(payload);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="avaliacao-${slug(
          payload?.paciente?.nome ?? "paciente"
        )}.pdf"`,
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

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
