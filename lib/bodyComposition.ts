// lib/bodyComposition.ts
// Tabelas + regras de composição corporal usadas na Avaliação Física.

export type Sexo = "M" | "F";
export type CodigoImagem = 1 | 2 | 3 | 4 | 5 | 6;

export interface AvaliacaoInput {
  pesoKg: number;
  alturaCm: number;
  idade: number;
  sexo: Sexo;
  pctAgua: number;
  massaMagraKg: number; // massa livre de gordura
  massaGordaKg: number;
  bfPct: number;
}

export interface Classificacao {
  status: "OTIMO" | "BOM" | "ATENCAO";
  cor: "verde" | "amarelo";
  label: string;
}

const IMME_TABLE = {
  F: [
    { idadeMin: 18, idadeMax: 39, limite: 8.3, bom: 9.7 },
    { idadeMin: 40, idadeMax: 59, limite: 8.1, bom: 9.4 },
    { idadeMin: 60, idadeMax: 999, limite: 7.5, bom: 8.9 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 39, limite: 10.8, bom: 12.6 },
    { idadeMin: 40, idadeMax: 59, limite: 10.6, bom: 12.4 },
    { idadeMin: 60, idadeMax: 999, limite: 9.7, bom: 11.5 },
  ],
} as const;

const MASSA_MUSCULAR_TABLE = {
  F: [
    { idadeMin: 18, idadeMax: 39, limite: 37.0, bom: 42.0 },
    { idadeMin: 40, idadeMax: 59, limite: 35.5, bom: 40.5 },
    { idadeMin: 60, idadeMax: 999, limite: 33.0, bom: 38.0 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 39, limite: 51.0, bom: 58.0 },
    { idadeMin: 40, idadeMax: 59, limite: 49.5, bom: 56.0 },
    { idadeMin: 60, idadeMax: 999, limite: 46.0, bom: 53.0 },
  ],
} as const;

const IMG_TABLE = {
  F: [
    { idadeMin: 18, idadeMax: 39, limite: 4.4, otimoMax: 5.3, bom: 9.3 },
    { idadeMin: 40, idadeMax: 59, limite: 5.4, otimoMax: 6.4, bom: 11.3 },
    { idadeMin: 60, idadeMax: 999, limite: 6.1, otimoMax: 7.2, bom: 12.0 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 39, limite: 2.3, otimoMax: 2.9, bom: 6.0 },
    { idadeMin: 40, idadeMax: 59, limite: 3.2, otimoMax: 3.9, bom: 7.4 },
    { idadeMin: 60, idadeMax: 999, limite: 3.6, otimoMax: 4.5, bom: 8.2 },
  ],
} as const;

const PERCENTUAL_GORDURA_TABLE = {
  F: [
    { idadeMin: 18, idadeMax: 25, otimoMin: 13.0, otimoMax: 16.0, bomMin: 17.0, bomMax: 19.0 },
    { idadeMin: 26, idadeMax: 35, otimoMin: 14.0, otimoMax: 16.0, bomMin: 18.0, bomMax: 20.0 },
    { idadeMin: 36, idadeMax: 45, otimoMin: 16.0, otimoMax: 19.0, bomMin: 20.0, bomMax: 23.0 },
    { idadeMin: 46, idadeMax: 55, otimoMin: 17.0, otimoMax: 21.0, bomMin: 23.0, bomMax: 25.0 },
    { idadeMin: 56, idadeMax: 999, otimoMin: 18.0, otimoMax: 22.0, bomMin: 24.0, bomMax: 26.0 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 25, otimoMin: 4.0, otimoMax: 6.0, bomMin: 8.0, bomMax: 10.0 },
    { idadeMin: 26, idadeMax: 35, otimoMin: 8.0, otimoMax: 11.0, bomMin: 12.0, bomMax: 15.0 },
    { idadeMin: 36, idadeMax: 45, otimoMin: 10.0, otimoMax: 14.0, bomMin: 16.0, bomMax: 18.0 },
    { idadeMin: 46, idadeMax: 55, otimoMin: 12.0, otimoMax: 16.0, bomMin: 18.0, bomMax: 20.0 },
    { idadeMin: 56, idadeMax: 999, otimoMin: 13.0, otimoMax: 18.0, bomMin: 20.0, bomMax: 21.0 },
  ],
} as const;

// Estas são as faixas do TXT enviado pelo usuário. Elas aparecem somente na
// coluna "Referência" do card, como valor adequado por sexo e idade.
const REFERENCIA_ADEQUADA_TABLE = {
  F: [
    { idadeMin: 18, idadeMax: 25, agua: 50.0, massaMuscular: 42.0, imme: 9.7, imgMin: 4.4, imgMax: 5.3, gorduraMin: 16.1, gorduraMax: 19.0 },
    { idadeMin: 26, idadeMax: 35, agua: 50.0, massaMuscular: 42.0, imme: 9.7, imgMin: 4.4, imgMax: 5.3, gorduraMin: 16.1, gorduraMax: 20.0 },
    { idadeMin: 36, idadeMax: 45, agua: 50.0, massaMuscular: 42.0, imme: 9.7, imgMin: 4.4, imgMax: 5.3, gorduraMin: 19.1, gorduraMax: 23.0 },
    { idadeMin: 46, idadeMax: 55, agua: 50.0, massaMuscular: 40.5, imme: 9.5, imgMin: 5.4, imgMax: 6.4, gorduraMin: 21.1, gorduraMax: 25.0 },
    { idadeMin: 56, idadeMax: 999, agua: 50.0, massaMuscular: 38.0, imme: 8.9, imgMin: 6.1, imgMax: 7.2, gorduraMin: 22.1, gorduraMax: 26.0 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 25, agua: 58.0, massaMuscular: 58.0, imme: 12.6, imgMin: 2.3, imgMax: 2.9, gorduraMin: 6.1, gorduraMax: 10.0 },
    { idadeMin: 26, idadeMax: 35, agua: 58.0, massaMuscular: 58.0, imme: 12.6, imgMin: 2.3, imgMax: 2.9, gorduraMin: 11.1, gorduraMax: 15.0 },
    { idadeMin: 36, idadeMax: 45, agua: 58.0, massaMuscular: 58.0, imme: 12.6, imgMin: 2.3, imgMax: 2.9, gorduraMin: 14.1, gorduraMax: 18.0 },
    { idadeMin: 46, idadeMax: 55, agua: 58.0, massaMuscular: 56.0, imme: 12.4, imgMin: 3.2, imgMax: 3.9, gorduraMin: 16.1, gorduraMax: 20.0 },
    { idadeMin: 56, idadeMax: 999, agua: 58.0, massaMuscular: 53.0, imme: 11.5, imgMin: 3.6, imgMax: 4.5, gorduraMin: 18.1, gorduraMax: 21.0 },
  ],
} as const;

const round = (v: number, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};

function pegarFaixa<S extends "M" | "F">(sexo: S, idade: number, tabela: any) {
  const t = tabela[sexo];
  return t.find((f: any) => idade >= f.idadeMin && idade <= f.idadeMax) ?? t[t.length - 1];
}

function classificarTrinca(kind: "baixo-bom-alto" | "baixo-bom-excesso", value: number, limite: number, bom: number): Classificacao {
  if (kind === "baixo-bom-alto") {
    if (value >= bom) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (value >= limite) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }

  if (value >= bom) return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  if (value >= limite) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

// Aproximação usada quando o sistema só dispõe da massa magra.
export const FRACAO_MUSCULO_ESQUELETICO = 0.45;

export function calcularIMME(massaMuscularEsqueleticaKg: number, alturaCm: number) {
  if (!alturaCm || alturaCm <= 0) return 0;
  const h = alturaCm / 100;
  return round(massaMuscularEsqueleticaKg / (h * h));
}

export function calcularIMG(massaGordaKg: number, alturaCm: number) {
  if (!alturaCm || alturaCm <= 0) return 0;
  const h = alturaCm / 100;
  return round(massaGordaKg / (h * h));
}

export function calcularFFMI(massaLivreGorduraKg: number, alturaCm: number) {
  if (!alturaCm || alturaCm <= 0) return 0;
  const h = alturaCm / 100;
  return round(massaLivreGorduraKg / (h * h));
}

export function classificarIMME(imme: number, sexo: Sexo, idade: number): Classificacao {
  const f = pegarFaixa(sexo, idade, IMME_TABLE);
  return classificarTrinca("baixo-bom-alto", imme, f.limite, f.bom);
}

export function classificarMassaMuscular(
  massaLivreGorduraKg: number,
  sexo: Sexo,
  idade: number,
): Classificacao {
  const f = pegarFaixa(sexo, idade, MASSA_MUSCULAR_TABLE);
  return classificarTrinca("baixo-bom-alto", massaLivreGorduraKg, f.limite, f.bom);
}

export function classificarIMG(img: number, sexo: Sexo, idade: number): Classificacao {
  const f = pegarFaixa(sexo, idade, IMG_TABLE);
  if (img < f.limite || img > f.bom) {
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }
  if (img <= f.otimoMax) {
    return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  }
  return { status: "BOM", cor: "verde", label: "Bom" };
}

export function classificarAgua(pct: number, sexo: Sexo): Classificacao {
  if (sexo === "M") {
    if (pct >= 58) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (pct >= 50) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }

  if (pct >= 50) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (pct >= 42) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

export function classificarFFMI(ffmi: number, sexo: Sexo): Classificacao {
  if (sexo === "M") {
    if (ffmi >= 21.5) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (ffmi >= 17.5) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }

  if (ffmi >= 19.0) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (ffmi >= 14.5) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

export function classificarPercentualGordura(
  bfPct: number,
  sexo: Sexo,
  idade: number,
): Classificacao {
  const faixa = pegarFaixa(sexo, idade, PERCENTUAL_GORDURA_TABLE);
  if (bfPct >= faixa.otimoMin && bfPct <= faixa.otimoMax) {
    return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  }
  if (bfPct >= faixa.bomMin && bfPct <= faixa.bomMax) {
    return { status: "BOM", cor: "verde", label: "Bom" };
  }
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

function formatarReferencia(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export function obterReferenciasComposicao(sexo: Sexo, idade: number) {
  const adequado = pegarFaixa(sexo, idade, REFERENCIA_ADEQUADA_TABLE);

  return {
    agua: `Adequado ≥ ${formatarReferencia(adequado.agua)}%`,
    massaMuscular: `Adequado ≥ ${formatarReferencia(adequado.massaMuscular)} kg`,
    imme: `Adequado ≥ ${formatarReferencia(adequado.imme)} kg/m²`,
    massaLivreGordura: `Adequado ≥ ${formatarReferencia(adequado.massaMuscular)} kg`,
    img: `Adequado ${formatarReferencia(adequado.imgMin)}–${formatarReferencia(adequado.imgMax)} kg/m²`,
    gordura: `Adequado ${formatarReferencia(adequado.gorduraMin)}–${formatarReferencia(adequado.gorduraMax)}%`,
  };
}

export function escolherImagemFrontal(sexo: Sexo, ffmi: number, bfPct: number): CodigoImagem {
  if (sexo === "M") {
    if (ffmi >= 21.5 && bfPct <= 12) return 3;
    if (ffmi >= 21.5 && bfPct > 12) return 4;
    if (ffmi >= 17.5 && ffmi <= 21.4 && bfPct <= 16) return 1;
    if (ffmi >= 17.5 && ffmi <= 21.4 && bfPct > 16) return 5;
    if (ffmi < 17.5 && bfPct > 16) return 2;
    return 6;
  }

  if (ffmi >= 19 && bfPct <= 20) return 3;
  if (ffmi >= 19 && bfPct > 20) return 4;
  if (ffmi >= 14.5 && ffmi <= 18.9 && bfPct <= 26) return 1;
  if (ffmi >= 14.5 && ffmi <= 18.9 && bfPct > 26) return 5;
  if (ffmi < 14.5 && bfPct > 26) return 2;
  return 6;
}

function imagemPrefixo(sexo: Sexo) {
  return sexo === "M" ? "masc" : "fem";
}

export function imagemFrontalUrl(sexo: Sexo, code: CodigoImagem): string {
  // Os arquivos 1–3 foram enviados ao repositório como .png.jpg e os
  // arquivos 4–6 como .png.png. Mantemos os nomes reais para não quebrar
  // os assets que já estão publicados.
  const extensao = code <= 3 ? "png.jpg" : "png.png";
  return `/images/avaliacao/${imagemPrefixo(sexo)}-frente-${code}.${extensao}`;
}

export function imagemLateralUrl(sexo: Sexo, code: CodigoImagem): string {
  return `/images/avaliacao/${imagemPrefixo(sexo)}-lateral-${code}.png.jpg`;
}

export function resumoCompleto(input: AvaliacaoInput) {
  const massaMuscularEsqueletica = Math.max(0, (input.massaMagraKg || 0) * FRACAO_MUSCULO_ESQUELETICO);
  const imme = calcularIMME(massaMuscularEsqueletica, input.alturaCm);
  const img = calcularIMG(input.massaGordaKg, input.alturaCm);
  const ffmi = calcularFFMI(input.massaMagraKg, input.alturaCm);
  const code = escolherImagemFrontal(input.sexo, ffmi, input.bfPct);
  const frontalUrl = imagemFrontalUrl(input.sexo, code);
  const lateralUrl = imagemLateralUrl(input.sexo, code);

  return {
    imme,
    img,
    ffmi,
    bfPct: round(input.bfPct, 1),
    pctAgua: round(input.pctAgua, 1),
    pesoKg: round(input.pesoKg, 1),
    alturaCm: round(input.alturaCm, 1),
    massaMagraKg: round(input.massaMagraKg, 1),
    massaGordaKg: round(input.massaGordaKg, 1),
    massaMuscularEsqueleticaKg: round(massaMuscularEsqueletica, 1),
    classificacoes: {
      agua: classificarAgua(input.pctAgua, input.sexo),
      massaMuscular: classificarMassaMuscular(input.massaMagraKg, input.sexo, input.idade),
      imme: classificarIMME(imme, input.sexo, input.idade),
      img: classificarIMG(img, input.sexo, input.idade),
      ffmi: classificarFFMI(ffmi, input.sexo),
      gordura: classificarPercentualGordura(input.bfPct, input.sexo, input.idade),
    },
    imagem: {
      codigo: code,
      url: frontalUrl,
      frontalUrl,
      lateralUrl,
    },
  };
}
