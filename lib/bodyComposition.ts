// lib/bodyComposition.ts
// Tabelas + regras de composição corporal usadas na Avaliação Física.

export type Sexo = "M" | "F";
export type CodigoImagem = 1 | 2 | 3;

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

const IMG_TABLE = {
  F: [
    { idadeMin: 18, idadeMax: 39, limite: 4.4, bom: 9.3 },
    { idadeMin: 40, idadeMax: 59, limite: 5.4, bom: 11.3 },
    { idadeMin: 60, idadeMax: 999, limite: 6.1, bom: 12.0 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 39, limite: 2.3, bom: 6.0 },
    { idadeMin: 40, idadeMax: 59, limite: 3.2, bom: 7.4 },
    { idadeMin: 60, idadeMax: 999, limite: 3.6, bom: 8.2 },
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
    if (value > bom) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (value >= limite) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }

  if (value > bom) return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
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

export function classificarIMG(img: number, sexo: Sexo, idade: number): Classificacao {
  const f = pegarFaixa(sexo, idade, IMG_TABLE);
  return classificarTrinca("baixo-bom-excesso", img, f.limite, f.bom);
}

export function classificarAgua(pct: number, sexo: Sexo): Classificacao {
  if (sexo === "M") {
    if (pct >= 58) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (pct >= 51) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }

  if (pct >= 50) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (pct >= 43) return { status: "BOM", cor: "verde", label: "Bom" };
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

export function classificarPercentualGordura(bfPct: number, sexo: Sexo): Classificacao {
  if (sexo === "M") {
    if (bfPct <= 12) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (bfPct <= 16) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }

  if (bfPct <= 20) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (bfPct <= 26) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

export function escolherImagemFrontal(sexo: Sexo, ffmi: number, bfPct: number): CodigoImagem {
  if (sexo === "M") {
    if (ffmi >= 21.5 && bfPct <= 12) return 3;
    if (ffmi >= 17.5 && ffmi <= 21.4 && bfPct <= 16) return 1;
    return 2;
  }

  if (ffmi >= 19 && bfPct <= 20) return 3;
  if (ffmi >= 14.5 && ffmi <= 18.9 && bfPct <= 26) return 1;
  return 2;
}

function imagemPrefixo(sexo: Sexo) {
  return sexo === "M" ? "masc" : "fem";
}

export function imagemFrontalUrl(sexo: Sexo, code: CodigoImagem): string {
  return `/images/avaliacao/${imagemPrefixo(sexo)}-frente-${code}.png.jpg`;
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
      imme: classificarIMME(imme, input.sexo, input.idade),
      img: classificarIMG(img, input.sexo, input.idade),
      ffmi: classificarFFMI(ffmi, input.sexo),
      gordura: classificarPercentualGordura(input.bfPct, input.sexo),
    },
    imagem: {
      codigo: code,
      url: frontalUrl,
      frontalUrl,
      lateralUrl,
    },
  };
}
