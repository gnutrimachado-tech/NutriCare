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

type ReferenceBand = {
  idadeMin: number;
  idadeMax: number;
  aguaMin: number;
  massaMuscularMin: number;
  massaMuscularMax: number;
  immeMin: number;
  massaLivreMin: number;
  massaAdiposaMin: number;
  massaAdiposaMax: number;
  imgMin: number;
  imgMax: number;
  gorduraMin: number;
  gorduraMax: number;
};

// Matriz de referência enviada nas imagens: cinco faixas de idade para cada
// sexo. Massa adiposa é uma massa em kg; IMG é um índice em kg/m².
const REFERENCE_TABLE: Record<Sexo, ReferenceBand[]> = {
  M: [
    {
      idadeMin: 18, idadeMax: 25, aguaMin: 58.0,
      massaMuscularMin: 38.0, massaMuscularMax: 44.0, immeMin: 12.6,
      massaLivreMin: 58.0, massaAdiposaMin: 3.1, massaAdiposaMax: 7.0,
      imgMin: 2.3, imgMax: 2.9, gorduraMin: 6.1, gorduraMax: 10.0,
    },
    {
      idadeMin: 26, idadeMax: 35, aguaMin: 58.0,
      massaMuscularMin: 38.0, massaMuscularMax: 44.0, immeMin: 12.6,
      massaLivreMin: 58.0, massaAdiposaMin: 5.0, massaAdiposaMax: 9.8,
      imgMin: 2.3, imgMax: 2.9, gorduraMin: 11.1, gorduraMax: 15.0,
    },
    {
      idadeMin: 36, idadeMax: 45, aguaMin: 58.0,
      massaMuscularMin: 38.0, massaMuscularMax: 44.0, immeMin: 12.6,
      massaLivreMin: 58.0, massaAdiposaMin: 6.0, massaAdiposaMax: 11.5,
      imgMin: 2.3, imgMax: 2.9, gorduraMin: 14.1, gorduraMax: 18.0,
    },
    {
      idadeMin: 46, idadeMax: 55, aguaMin: 58.0,
      massaMuscularMin: 36.5, massaMuscularMax: 42.5, immeMin: 12.4,
      massaLivreMin: 56.0, massaAdiposaMin: 8.5, massaAdiposaMax: 14.5,
      imgMin: 3.2, imgMax: 3.9, gorduraMin: 16.1, gorduraMax: 20.0,
    },
    {
      idadeMin: 56, idadeMax: 999, aguaMin: 58.0,
      massaMuscularMin: 34.0, massaMuscularMax: 40.0, immeMin: 11.5,
      massaLivreMin: 53.0, massaAdiposaMin: 9.8, massaAdiposaMax: 15.8,
      imgMin: 3.6, imgMax: 4.5, gorduraMin: 18.1, gorduraMax: 21.0,
    },
  ],
  F: [
    {
      idadeMin: 18, idadeMax: 25, aguaMin: 50.0,
      massaMuscularMin: 24.5, massaMuscularMax: 30.5, immeMin: 9.7,
      massaLivreMin: 42.0, massaAdiposaMin: 8.1, massaAdiposaMax: 11.5,
      imgMin: 4.4, imgMax: 5.3, gorduraMin: 16.1, gorduraMax: 19.0,
    },
    {
      idadeMin: 26, idadeMax: 35, aguaMin: 50.0,
      massaMuscularMin: 24.5, massaMuscularMax: 30.5, immeMin: 9.7,
      massaLivreMin: 42.0, massaAdiposaMin: 8.5, massaAdiposaMax: 12.5,
      imgMin: 4.4, imgMax: 5.3, gorduraMin: 16.1, gorduraMax: 20.0,
    },
    {
      idadeMin: 36, idadeMax: 45, aguaMin: 50.0,
      massaMuscularMin: 24.5, massaMuscularMax: 30.5, immeMin: 9.7,
      massaLivreMin: 42.0, massaAdiposaMin: 10.5, massaAdiposaMax: 14.8,
      imgMin: 4.4, imgMax: 5.3, gorduraMin: 19.1, gorduraMax: 23.0,
    },
    {
      idadeMin: 46, idadeMax: 55, aguaMin: 50.0,
      massaMuscularMin: 23.0, massaMuscularMax: 29.0, immeMin: 9.5,
      massaLivreMin: 40.5, massaAdiposaMin: 12.0, massaAdiposaMax: 16.5,
      imgMin: 5.4, imgMax: 6.4, gorduraMin: 21.1, gorduraMax: 25.0,
    },
    {
      idadeMin: 56, idadeMax: 999, aguaMin: 50.0,
      massaMuscularMin: 21.5, massaMuscularMax: 27.5, immeMin: 8.9,
      massaLivreMin: 38.0, massaAdiposaMin: 13.0, massaAdiposaMax: 17.8,
      imgMin: 6.1, imgMax: 7.2, gorduraMin: 22.1, gorduraMax: 26.0,
    },
  ],
};

const round = (v: number, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};

function pegarFaixa<S extends "M" | "F">(sexo: S, idade: number, tabela: any) {
  const t = tabela[sexo];
  return t.find((f: any) => idade >= f.idadeMin && idade <= f.idadeMax) ?? t[t.length - 1];
}

function classificacaoOtima(): Classificacao {
  return { status: "OTIMO", cor: "verde", label: "Ótimo" };
}

function classificacaoAtencao(): Classificacao {
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

function classificarFaixa(value: number, min: number, max: number): Classificacao {
  return value >= min && value <= max ? classificacaoOtima() : classificacaoAtencao();
}

function classificarMinimo(value: number, min: number): Classificacao {
  return value >= min ? classificacaoOtima() : classificacaoAtencao();
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
  return classificarMinimo(imme, pegarFaixa(sexo, idade, REFERENCE_TABLE).immeMin);
}

export function classificarMassaMuscular(
  massaLivreGorduraKg: number,
  sexo: Sexo,
  idade: number,
): Classificacao {
  const f = pegarFaixa(sexo, idade, REFERENCE_TABLE);
  // O produto já usa este valor como massa livre de gordura (o card e o PDF
  // exibem a mesma medida em kg). A referência correspondente é FFM.
  return classificarMinimo(massaLivreGorduraKg, f.massaLivreMin);
}

export function classificarMassaLivreGordura(
  massaLivreGorduraKg: number,
  sexo: Sexo,
  idade: number,
): Classificacao {
  return classificarMinimo(
    massaLivreGorduraKg,
    pegarFaixa(sexo, idade, REFERENCE_TABLE).massaLivreMin,
  );
}

export function classificarMassaAdiposa(
  massaAdiposaKg: number,
  sexo: Sexo,
  idade: number,
): Classificacao {
  const f = pegarFaixa(sexo, idade, REFERENCE_TABLE);
  return classificarFaixa(massaAdiposaKg, f.massaAdiposaMin, f.massaAdiposaMax);
}

export function classificarIMG(img: number, sexo: Sexo, idade: number): Classificacao {
  const f = pegarFaixa(sexo, idade, REFERENCE_TABLE);
  return classificarFaixa(img, f.imgMin, f.imgMax);
}

export function classificarAgua(pct: number, sexo: Sexo): Classificacao {
  return classificarMinimo(pct, sexo === "M" ? 58 : 50);
}

export function classificarFFMI(ffmi: number, sexo: Sexo): Classificacao {
  // Mantido para compatibilidade com chamadas antigas que realmente passam
  // FFMI. A classificação exibida no produto usa
  // classificarMassaLivreGordura, pois a referência é em kg.
  if (sexo === "M") return classificarMinimo(ffmi, 21.5);
  return classificarMinimo(ffmi, 19.0);
}

export function classificarPercentualGordura(
  bfPct: number,
  sexo: Sexo,
  idade = 18,
): Classificacao {
  const f = pegarFaixa(sexo, idade, REFERENCE_TABLE);
  return classificarFaixa(bfPct, f.gorduraMin, f.gorduraMax);
}

export function escolherImagemFrontal(sexo: Sexo, ffmi: number, bfPct: number): CodigoImagem {
  if (sexo === "M") {
    if (ffmi >= 21.5) return bfPct <= 12 ? 3 : 4;
    if (ffmi >= 17.5) return bfPct <= 16 ? 1 : 5;
    return bfPct <= 16 ? 6 : 2;
  }

  if (ffmi >= 19) return bfPct <= 20 ? 3 : 4;
  if (ffmi >= 14.5) return bfPct <= 26 ? 1 : 5;
  return bfPct <= 26 ? 6 : 2;
}

function imagemPrefixo(sexo: Sexo) {
  return sexo === "M" ? "masc" : "fem";
}

export function imagemFrontalUrl(sexo: Sexo, code: CodigoImagem): string {
  // Os arquivos atuais da pasta public/images/avaliacao foram salvos com
  // .png.jpg para as imagens 1–3 e .png.png para as imagens 4–6.
  const extensao = code <= 3 ? "png.jpg" : "png.png";
  return `/images/avaliacao/${imagemPrefixo(sexo)}-frente-${code}.${extensao}`;
}

export function imagemLateralUrl(sexo: Sexo, code: CodigoImagem): string {
  return `/images/avaliacao/${imagemPrefixo(sexo)}-lateral-${code}.png.jpg`;
}

export function resumoCompleto(input: AvaliacaoInput) {
  const pesoKg = Math.max(0, Number(input.pesoKg) || 0);
  const bfPct = Math.max(0, Number(input.bfPct) || 0);
  const massaGordaCalculada =
    bfPct > 0 ? (pesoKg * bfPct) / 100 : Number(input.massaGordaKg) || 0;
  const massaGordaKg = Math.max(0, massaGordaCalculada);
  const massaMagraKg =
    pesoKg > 0 && massaGordaKg >= 0
      ? Math.max(0, pesoKg - massaGordaKg)
      : Math.max(0, Number(input.massaMagraKg) || 0);
  const massaMuscularEsqueletica = Math.max(0, massaMagraKg * FRACAO_MUSCULO_ESQUELETICO);
  const imme = calcularIMME(massaMuscularEsqueletica, input.alturaCm);
  const img = calcularIMG(massaGordaKg, input.alturaCm);
  const ffmi = calcularFFMI(massaMagraKg, input.alturaCm);
  const code = escolherImagemFrontal(input.sexo, ffmi, bfPct);
  const frontalUrl = imagemFrontalUrl(input.sexo, code);
  const lateralUrl = imagemLateralUrl(input.sexo, code);

  return {
    imme,
    img,
    ffmi,
    bfPct: round(bfPct, 1),
    pctAgua: round(input.pctAgua, 1),
    pesoKg: round(pesoKg, 1),
    alturaCm: round(input.alturaCm, 1),
    massaMagraKg: round(massaMagraKg, 1),
    massaGordaKg: round(massaGordaKg, 1),
    massaMuscularEsqueleticaKg: round(massaMuscularEsqueletica, 1),
    classificacoes: {
      agua: classificarAgua(input.pctAgua, input.sexo),
      massaMuscular: classificarMassaMuscular(massaMagraKg, input.sexo, input.idade),
      imme: classificarIMME(imme, input.sexo, input.idade),
      massaAdiposa: classificarMassaAdiposa(massaGordaKg, input.sexo, input.idade),
      img: classificarIMG(img, input.sexo, input.idade),
      ffmi: classificarMassaLivreGordura(massaMagraKg, input.sexo, input.idade),
      gordura: classificarPercentualGordura(bfPct, input.sexo, input.idade),
    },
    imagem: {
      codigo: code,
      url: frontalUrl,
      frontalUrl,
      lateralUrl,
    },
  };
}
