// lib/bodyComposition.ts
// Tabelas e cálculos transcritas das imagens anexadas no chat.
// Fontes:
//   - IMME (massa muscular esquelética): Tabela de Referência para o Código do Sistema
//   - IMG (índice de massa gorda): Tabela de Referência: Índice de Massa Gorda (kg/m²)
//   - FFMI: Fórmula Direta = Massa Livre de Gordura / altura²
//   - IMME/IMG: Massa (kg) / altura²
//   - % Gordura: Pollock & Wilmore 1993
//
// Regras de imagem (params decididos pelo usuário no chat):
//   MASCULINO
//     FFMI >= 21.5 e BF% <= 12%                  -> imagem 3
//     FFMI 17.5..21.4 e BF% <= 16%               -> imagem 1
//     FFMI < 17.5 (falta músculo) ou BF% >= 17%  -> imagem 2
//   FEMININO
//     FFMI >= 19.0 e BF% <= 20%                  -> imagem 3
//     FFMI 14.5..18.9 e BF% <= 26%               -> imagem 1
//     FFMI < 14.5 (falta músculo) ou BF% >= 27%  -> imagem 2
//
// Regras de % de água (cor PO card, círculo amarelo no PDF):
//   MASCULINO
//     >= 58%             OTIMO   (verde)
//     51 a 57            BOM     (verde)
//     < 50%              ATENCAO (amarelo)
//     50.0..50.99        BOM     (faixa entre Bom e Atenção – adotado BOM)
//   FEMININO
//     >= 50%             OTIMO   (verde)
//     43 a 49            BOM     (verde)
//     < 42%              ATENCAO (amarelo)
//     42.0..42.99        BOM     (faixa entre Bom e Atenção – adotado BOM)

export type Sexo = "M" | "F";

export interface AvaliacaoInput {
  pesoKg: number;
  alturaM: number;
  idade: number;
  sexo: Sexo;
  pctAgua: number;                 // % de água corporal (Watson ou similar)
  massaMagraKg: number;            // massa magra total
  massaGordaKg: number;            // massa gorda total
  bfPct: number;                   // % de gordura corporal
  massaMuscularEsqueleticaKg: number; // para IMME
  massaLivreGorduraKg: number;      // para FFMI
}

export interface Classificacao {
  status: "OTIMO" | "BOM" | "ATENCAO";
  cor: "verde" | "amarelo";
  label: string;
}

// ---------------- Tabelas (transcritas das imagens) ----------------

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

function faixa(
  sexo: Sexo,
  idade: number,
  tabela: typeof IMME_TABLE
) {
  const t = tabela[sexo];
  return t.find((f) => idade >= f.idadeMin && idade <= f.idadeMax) ?? t[t.length - 1];
}

const round = (v: number, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};

// ---------------- Cálculos ----------------

export function calcularIMME(massaMuscularEsqueleticaKg: number, alturaM: number) {
  if (!alturaM || alturaM <= 0) return { valor: 0 };
  return { valor: round(massaMuscularEsqueleticaKg / (alturaM * alturaM)) };
}

export function calcularIMG(massaGordaKg: number, alturaM: number) {
  if (!alturaM || alturaM <= 0) return { valor: 0 };
  return { valor: round(massaGordaKg / (alturaM * alturaM)) };
}

export function calcularFFMI(massaLivreGorduraKg: number, alturaM: number) {
  if (!alturaM || alturaM <= 0) return { valor: 0 };
  return { valor: round(massaLivreGorduraKg / (alturaM * alturaM)) };
}

// ---------------- Classificações ----------------

export function classificarIMME(imme: number, sexo: Sexo, idade: number): Classificacao {
  const f = faixa(sexo, idade, IMME_TABLE);
  if (imme > f.bom) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (imme >= f.limite) return { status: "BOM", cor: "verde", label: "Bom" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

export function classificarIMG(img: number, sexo: Sexo, idade: number): Classificacao {
  const f = faixa(sexo, idade, IMG_TABLE);
  if (img > f.bom) return { status: "ATENCAO", cor: "amarelo", label: "Atenção (Excesso)" };
  if (img >= f.limite) return { status: "BOM", cor: "verde", label: "Bom (Eutrofia)" };
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção (Abaixo do ideal)" };
}

export function classificarAgua(pct: number, sexo: Sexo): Classificacao {
  // Másculo
  if (sexo === "M") {
    if (pct >= 58) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
    if (pct >= 50) return { status: "BOM", cor: "verde", label: "Bom" }; // 50..57.9 -> BOM (50.0..50.99 cai aqui por definição inclusiva)
    return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
  }
  // Feminino
  if (pct >= 50) return { status: "OTIMO", cor: "verde", label: "Ótimo" };
  if (pct >= 42) return { status: "BOM", cor: "verde", label: "Bom" }; // 42.0..42.99 -> BOM
  return { status: "ATENCAO", cor: "amarelo", label: "Atenção" };
}

// ---------------- Escolha de imagem (frente + lateral) ----------------

export type CodigoImagem = 1 | 2 | 3;

export function escolherImagem(
  sexo: Sexo,
  ffmi: number,
  bfPct: number
): CodigoImagem {
  if (sexo === "M") {
    if (ffmi >= 21.5 && bfPct <= 12) return 3;
    if (ffmi >= 17.5 && ffmi <= 21.4 && bfPct <= 16) return 1;
    return 2; // FFMI < 17.5 (falta músculo) OU BF% >= 17% (excesso)
  }
  // Feminino
  if (ffmi >= 19 && bfPct <= 20) return 3;
  if (ffmi >= 14.5 && ffmi <= 18.9 && bfPct <= 26) return 1;
  return 2; // FFMI < 14.5 (falta músculo) OU BF% >= 27% (excesso)
}

// Caminhos esperados em /public/images/avaliacao/
//   masc-1.png, masc-2.png, masc-3.png   -> frente masculina nas 3 categorias
//   fem-1.png,  fem-2.png,  fem-3.png    -> frente feminina nas 3 categorias
//   (seu Drive já tem imagem 1/2/3 — renomeie/posicione conforme padrão acima)
//
// Padrão de nomenclatura alternativo se preferir manter os nomes do drive:
// const SUFIXO = { 1: "1", 2: "2", 3: "3" } e usar `${sexo === "M" ? "masc" : "fem"}-${SUFIXO[code]}.png`
export function imagemUrl(sexo: Sexo, code: CodigoImagem): string {
  const prefix = sexo === "M" ? "masc" : "fem";
  return `/images/avaliacao/${prefix}-${code}.png`;
}

// ---------------- Função agregada para usar nas rotas/page ----------------

export function resumoCompleto(input: AvaliacaoInput) {
  const imme = calcularIMME(input.massaMuscularEsqueleticaKg, input.alturaM).valor;
  const img = calcularIMG(input.massaGordaKg, input.alturaM).valor;
  const ffmi = calcularFFMI(input.massaLivreGorduraKg, input.alturaM).valor;

  return {
    imme,
    img,
    ffmi,
    bfPct: round(input.bfPct),
    pctAgua: round(input.pctAgua),
    classificacoes: {
      agua: classificarAgua(input.pctAgua, input.sexo),
      imme: classificarIMME(imme, input.sexo, input.idade),
      img: classificarIMG(img, input.sexo, input.idade),
    },
    imagem: {
      codigo: escolherImagem(input.sexo, ffmi, input.bfPct),
      url: imagemUrl(input.sexo, escolherImagem(input.sexo, ffmi, input.bfPct)),
    },
  };
}
