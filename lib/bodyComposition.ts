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
    { idadeMin: 18, idadeMax: 25, agua: 50.0, massaMuscularMin: 24.5, massaMuscularMax: 30.5, imme: 9.7, massaLivreGordura: 42.0, massaAdiposaMin: 8.1, massaAdiposaMax: 11.5, imgMin: 4.4, imgMax: 5.3, gorduraMin: 16.1, gorduraMax: 19.0 },
    { idadeMin: 26, idadeMax: 35, agua: 50.0, massaMuscularMin: 24.5, massaMuscularMax: 30.5, imme: 9.7, massaLivreGordura: 42.0, massaAdiposaMin: 8.5, massaAdiposaMax: 12.5, imgMin: 4.4, imgMax: 5.3, gorduraMin: 16.1, gorduraMax: 20.0 },
    { idadeMin: 36, idadeMax: 45, agua: 50.0, massaMuscularMin: 24.5, massaMuscularMax: 30.5, imme: 9.7, massaLivreGordura: 42.0, massaAdiposaMin: 10.5, massaAdiposaMax: 14.8, imgMin: 4.4, imgMax: 5.3, gorduraMin: 19.1, gorduraMax: 23.0 },
    { idadeMin: 46, idadeMax: 55, agua: 50.0, massaMuscularMin: 23.0, massaMuscularMax: 29.0, imme: 9.5, massaLivreGordura: 40.5, massaAdiposaMin: 12.0, massaAdiposaMax: 16.5, imgMin: 5.4, imgMax: 6.4, gorduraMin: 21.1, gorduraMax: 25.0 },
    { idadeMin: 56, idadeMax: 999, agua: 50.0, massaMuscularMin: 21.5, massaMuscularMax: 27.5, imme: 8.9, massaLivreGordura: 38.0, massaAdiposaMin: 13.0, massaAdiposaMax: 17.8, imgMin: 6.1, imgMax: 7.2, gorduraMin: 22.1, gorduraMax: 26.0 },
  ],
  M: [
    { idadeMin: 18, idadeMax: 25, agua: 58.0, massaMuscularMin: 38.0, massaMuscularMax: 44.0, imme: 12.6, massaLivreGordura: 58.0, massaAdiposaMin: 3.1, massaAdiposaMax: 7.0, imgMin: 2.3, imgMax: 2.9, gorduraMin: 6.1, gorduraMax: 10.0 },
    { idadeMin: 26, idadeMax: 35, agua: 58.0, massaMuscularMin: 38.0, massaMuscularMax: 44.0, imme: 12.6, massaLivreGordura: 58.0, massaAdiposaMin: 5.0, massaAdiposaMax: 9.8, imgMin: 2.3, imgMax: 2.9, gorduraMin: 11.1, gorduraMax: 15.0 },
    { idadeMin: 36, idadeMax: 45, agua: 58.0, massaMuscularMin: 38.0, massaMuscularMax: 44.0, imme: 12.6, massaLivreGordura: 58.0, massaAdiposaMin: 6.0, massaAdiposaMax: 11.5, imgMin: 2.3, imgMax: 2.9, gorduraMin: 14.1, gorduraMax: 18.0 },
    { idadeMin: 46, idadeMax: 55, agua: 58.0, massaMuscularMin: 36.5, massaMuscularMax: 42.5, imme: 12.4, massaLivreGordura: 56.0, massaAdiposaMin: 8.5, massaAdiposaMax: 14.5, imgMin: 3.2, imgMax: 3.9, gorduraMin: 16.1, gorduraMax: 20.0 },
    { idadeMin: 56, idadeMax: 999, agua: 58.0, massaMuscularMin: 34.0, massaMuscularMax: 40.0, imme: 11.5, massaLivreGordura: 53.0, massaAdiposaMin: 9.8, massaAdiposaMax: 15.8, imgMin: 3.6, imgMax: 4.5, gorduraMin: 18.1, gorduraMax: 21.0 },
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

export function classificarMassaAdiposa(
  massaAdiposaKg: number,
  sexo: Sexo,
  idade: number,
): Classificacao {
  const faixa = pegarFaixa(sexo, idade, REFERENCIA_ADEQUADA_TABLE);
  if (
    massaAdiposaKg >= faixa.massaAdiposaMin &&
    massaAdiposaKg <= faixa.massaAdiposaMax
  ) {
    return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  }
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
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
  const faixa = (min: number, max: number, unidade: string) =>
    `${formatarReferencia(min)}–${formatarReferencia(max)} ${unidade}`;

  return {
    agua: `Adequado: ${formatarReferencia(adequado.agua)}% ou mais`,
    massaMuscular: `Adequado: ${faixa(adequado.massaMuscularMin, adequado.massaMuscularMax, "kg")}`,
    imme: `Adequado: ${formatarReferencia(adequado.imme)} kg/m² ou mais`,
    massaLivreGordura: `Adequado: ${formatarReferencia(adequado.massaLivreGordura)} kg ou mais`,
    massaAdiposa: `Adequado: ${faixa(adequado.massaAdiposaMin, adequado.massaAdiposaMax, "kg")}`,
    img: `Adequado: ${formatarReferencia(adequado.imgMin)}–${formatarReferencia(adequado.imgMax)} kg/m²`,
    gordura: `Adequado: ${formatarReferencia(adequado.gorduraMin)}–${formatarReferencia(adequado.gorduraMax)}%`,
  };
}

export function escolherImagemFrontal(sexo: Sexo, ffmi: number, bfPct: number): CodigoImagem {
  if (sexo === "M") {
    if (ffmi >= 21.5) return bfPct <= 12 ? 3 : 4;
    if (ffmi >= 17.5 && ffmi < 21.5) return bfPct <= 16 ? 1 : 5;
    return bfPct <= 16 ? 6 : 2;
  }

  if (ffmi >= 19) return bfPct <= 20 ? 3 : 4;
  if (ffmi >= 14.5 && ffmi < 19) return bfPct <= 26 ? 1 : 5;
  return bfPct <= 26 ? 6 : 2;
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
  const pesoValido = Number.isFinite(input.pesoKg) && input.pesoKg > 0;
  const gorduraValida =
    pesoValido &&
    Number.isFinite(input.bfPct) &&
    input.bfPct >= 0;
  const massaGordaCalculada = gorduraValida
    ? (input.pesoKg * input.bfPct) / 100
    : input.massaGordaKg || 0;
  const massaMagraCalculada = pesoValido
    ? Math.max(0, input.pesoKg - massaGordaCalculada)
    : Math.max(0, input.massaMagraKg || 0);
  const massaMuscularEsqueletica = Math.max(
    0,
    massaMagraCalculada * FRACAO_MUSCULO_ESQUELETICO,
  );
  const imme = calcularIMME(massaMuscularEsqueletica, input.alturaCm);
  const img = calcularIMG(massaGordaCalculada, input.alturaCm);
  const ffmi = calcularFFMI(massaMagraCalculada, input.alturaCm);
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
    massaMagraKg: round(massaMagraCalculada, 1),
    massaGordaKg: round(massaGordaCalculada, 1),
    massaMuscularEsqueleticaKg: round(massaMuscularEsqueletica, 1),
    classificacoes: {
      agua: classificarAgua(input.pctAgua, input.sexo),
      massaMuscular: classificarMassaMuscular(massaMagraCalculada, input.sexo, input.idade),
      imme: classificarIMME(imme, input.sexo, input.idade),
      massaAdiposa: classificarMassaAdiposa(massaGordaCalculada, input.sexo, input.idade),
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
