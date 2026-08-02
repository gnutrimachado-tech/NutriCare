// lib/bodyComposition.ts
// Tabelas (transcritas das imagens do chat) + regras de seleção de imagem
// (texto exato do chat) + classificação de % de água (cores por sexo).
//
// IMAGENS usadas no chat:
//   - "Tabela de Referência para o Código do Sistema"  -> IMME (Massa Muscular Esquelética)
//   - "Tabela de Referência: Índice de Massa Gorda" -> IMG
//   - "Cálculo da Massa Muscular / Massa Gorda"      -> fórmulas IMME/IMG
//   - "Fórmula Direta do FFMI"                        -> FFMI
//   - "Tabela da % de gordura separada por idade e gênero" -> Pollock & Wilmore 1993
//
// REGRAS DE IMAGEM (texto exato do chat):
//   Masculino:
//     FFMI >= 21.5 e BF% <= 12%                 -> imagem 3
//     FFMI entre 17.5 e 21.4 e BF% <= 16%       -> imagem 1
//     FFMI < 17.5 (falta músculo) ou BF% >= 17% -> imagem 2
//   Feminino:
//     FFMI >= 19.0 e BF% <= 20%                 -> imagem 3
//     FFMI entre 14.5 e 18.9 e BF% <= 26%       -> imagem 1
//     FFMI < 14.5 (falta músculo) ou BF% >= 27% -> imagem 2

export type Sexo = "M" | "F";
export type CodigoImagem = 1 | 2 | 3;

export interface AvaliacaoInput {
  pesoKg: number;
  alturaCm: number;
  idade: number;
  sexo: Sexo;
  pctAgua: number;
  massaMagraKg: number;          // = massa livre de gordura
  massaGordaKg: number;
  bfPct: number;
}

export interface Classificacao {
  status: "OTIMO" | "BOM" | "ATENCAO";
  cor: "verde" | "amarelo";
  label: string;
}

// ------------- Tabelas transcritas das imagens -------------
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

// Aproximação usada apenas quando o sistema ainda não coletou massa muscular
// esquelética em separado. Na literatura, músculo esquelético representa
// cerca de 40-50% da massa livre de gordura (varia por sexo/idade).
// 0.45 é um meio termo conservador.
// Para mudar a constante, ajuste aqui -> tabela IMME do PDF muda junto.
export const FRACAO_MUSCULO_ESQUELETICO = 0.45;

// ------------- Cálculos -------------
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

// ------------- Classificações -------------
export function classificarIMME(imme: number, sexo: Sexo, idade: number): Classificacao {
  const f = pegarFaixa(sexo, idade, IMME_TABLE);
  if (imme > f.bom) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (imme >= f.limite) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

export function classificarIMG(img: number, sexo: Sexo, idade: number): Classificacao {
  const f = pegarFaixa(sexo, idade, IMG_TABLE);
  if (img > f.bom) return { status: "ATENCAO", cor: "amarelo", label: "Atenção (Excesso)" };
  if (img >= f.limite) return { status: "BOM", cor: "verde", label: "Bom (Eutrofia)" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção (Abaixo do Ideal)" };
}

export function classificarAgua(pct: number, sexo: Sexo): Classificacao {
  // Regras do chat (decisão sobre o "vão" de 50–51 para masc e 42–43 para fem
  // ----- ambos adoptados como BOM para não ficar sem classificação):
  //   Masc: >=58 ÓTIMO, 51..57 BOM, <50 ATENÇÃO -> 50.x vira BOM
  //   Fem:  >=50 ÓTIMO, 43..49 BOM, <42 ATENÇÃO -> 42.x vira BOM
  if (sexo === "M") {
    if (pct >= 58) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (pct >= 50) return { status: "BOM", cor: "verde", label: "Bom" };
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }
  if (pct >= 50) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (pct >= 42) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

// ------------- Escolha de imagem frontal -------------
export function escolherImagemFrontal(sexo: Sexo, ffmi: number, bfPct: number): CodigoImagem {
  if (sexo === "M") {
    if (ffmi >= 21.5 && bfPct <= 12) return 3;
    if (ffmi >= 17.5 && ffmi <= 21.4 && bfPct <= 16) return 1;
    return 2; // FFMI < 17.5 (falta músculo) OU BF% >= 17% (excesso)
  }
  if (ffmi >= 19 && bfPct <= 20) return 3;
  if (ffmi >= 14.5 && ffmi <= 18.9 && bfPct <= 26) return 1;
  return 2; // FFMI < 14.5 (falta músculo) OU BF% >= 27% (excesso)
}

export function imagemFrontalUrl(sexo: Sexo, code: CodigoImagem): string {
  const prefix = sexo === "M" ? "masc" : "fem";
  return `/images/avaliacao/${prefix}-${code}.png`;
}

// ------------- Função agregada -------------
export function resumoCompleto(input: AvaliacaoInput) {
  const alturaM = input.alturaCm / 100;
  const massaMuscularEsqueletica =
    Math.max(0, (input.massaMagraKg || 0) * FRACAO_MUSCULO_ESQUELETICO);

  const imme = calcularIMME(massaMuscularEsqueletica, input.alturaCm);
  const img = calcularIMG(input.massaGordaKg, input.alturaCm);
  const ffmi = calcularFFMI(input.massaMagraKg, input.alturaCm);

  const code = escolherImagemFrontal(input.sexo, ffmi, input.bfPct);

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
    classificacoes: {
      agua: classificarAgua(input.pctAgua, input.sexo),
      imme: classificarIMME(imme, input.sexo, input.idade),
      img: classificarIMG(img, input.sexo, input.idade),
    },
    imagem: {
      codigo: code,
      url: imagemFrontalUrl(input.sexo, code),
    },
  };
}
