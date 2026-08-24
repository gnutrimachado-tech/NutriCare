// lib/avaliacaoPdf.tsx
// Layout do PDF de Avaliação Física.
//
// AJUSTE (setas do mock):
//   1) Rodapé "Nutricionista" idêntico ao PDF de Orientações: traço fino
//      acompanhando o texto, CRN em GreatVibes 16pt logo abaixo.
//   2) Logo do rodapé com a mesma altura/localização do PDF de Orientações
//      (width 42, opacidade 0.15, canto inferior direito).
//   3) Cabeçalho — traço fino, altura do logo e posição dos dados do paciente
//      exatamente iguais ao PDF de Orientações (PAGE_MARGIN_X=30, logo em
//      HEADER_LINE_Y+6 com targetWidth<=68, nome/nascimento/altura na mesma
//      grade x=PAGE_MARGIN_X+76).
//   4) Título "AVALIAÇÃO FÍSICA" na mesma altura e mesmo tamanho do PDF de
//      Orientações (Helvetica-Bold 20, TITLE_Y = HEADER_LINE_Y - 28.35).
//
// Nada dos cards internos (Composição Corporal, Circunferências, Dobras,
// Evolução e Evolução Comparativa) foi alterado.

import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Circle,
  Rect,
  Polyline,
  Font,
} from "@react-pdf/renderer";

// ---------- Tipos ----------
export type SummarySnapshot = {
  pesoKg?: number | null;
  bodyFatPct?: number | null;
  massaMuscularKg?: number | null;
  massaAdiposaKg?: number | null;
  aguaPct?: number | null;
  imme?: number | null;
  img?: number | null;
  ffmi?: number | null;
  createdAt?: string | null;
  protocolLabel?: string | null;
};

export type MeasurementMap = Record<string, number | null | undefined>;

export type EvolucaoPonto = {
  data: string; // "20/03"
  peso?: number | null;
  massaMuscular?: number | null;
  bfPct?: number | null;
};

// Pontos de evolução vinculados a cada avaliação do histórico (1ª, 2ª, 3ª),
// usados quando o nutri marca as caixas de seleção de comparação.
export type EvolucaoHistoricoPonto = {
  id: string;
  data: string;
  peso?: number | null;
  massaMuscular?: number | null;
  bfPct?: number | null;
};

type PdfProps = {
  paciente: {
    nome: string;
    sexo: "M" | "F";
    idade: number;
    altura_cm: number;
    nascimento?: string | null;
  };
  dados: {
    data: string;
    pesoKg: number;
    pctAgua: number;
    massaMagraKg: number;
    massaGordaKg: number;
    bfPct: number;
    imme: number;
    img: number;
    ffmi: number;
    classificacaoAgua?: { cor: "verde" | "amarelo"; label: string };
    classificacaoImg?: { cor: "verde" | "amarelo"; label: string };
    classificacaoMassaMuscular?: { cor: "verde" | "amarelo"; label: string };
    classificacaoImme?: { cor: "verde" | "amarelo"; label: string };
    classificacaoMassaAdiposa?: { cor: "verde" | "amarelo"; label: string };
    classificacaoFfmi?: { cor: "verde" | "amarelo"; label: string };
    classificacaoGordura?: { cor: "verde" | "amarelo"; label: string };
    imagemFrenteUrl?: string;
    imagemLateralUrl?: string;
    compareResults?: boolean;
    currentDobras?: MeasurementMap;
    currentCircunferencias?: MeasurementMap;
    previousDobras?: MeasurementMap;
    previousCircunferencias?: MeasurementMap;
    previousSummary?: SummarySnapshot | null;
    evolucao?: EvolucaoPonto[];
    // Histórico (1ª/2ª/3ª) + seleção feita na aba Antropometria:
    evolucaoHistorico?: EvolucaoHistoricoPonto[];
    evolucaoSelecionadaIds?: string[];
    dataAvaliacaoInicial?: string | null;
  };
  nutricionista: {
    nome: string;
    crn: string;
    email?: string;
  };
};

// ---------- Labels ----------
const CIRC_LABELS: Record<string, string> = {
  pescoco: "Pescoço",
  cintura: "Cintura",
  quadril: "Quadril",
  abdomen: "Abdômen",
  peitoral: "Peitoral",
  braco_direito: "Braço direito",
  braco_esquerdo: "Braço esquerdo",
  biceps: "Bíceps",
  biceps_direito: "Bíceps direito",
  biceps_esquerdo: "Bíceps esquerdo",
  coxa: "Coxa",
  coxa_direita: "Coxa direita",
  coxa_esquerda: "Coxa esquerda",
  panturrilha: "Panturrilha",
  panturrilha_direita: "Panturrilha direita",
  panturrilha_esquerda: "Panturrilha esquerda",
};
const DOBRAS_LABELS: Record<string, string> = {
  peitoral: "Peitoral",
  axilar_media: "Axilar média",
  tricipital: "Tricipital",
  subescapular: "Subescapular",
  abdomen: "Abdômen",
  supra_iliaca: "Suprailíaca",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
  supra_espinhal: "Supraespinhal",
  biceps: "Bíceps",
  coxa_proximal: "Coxa proximal",
};
const CIRC_ORDER = [
  "pescoco",
  "cintura",
  "quadril",
  "abdomen",
  "peitoral",
  "braco_direito",
  "braco_esquerdo",
  "coxa_direita",
  "coxa_esquerda",
  "panturrilha_direita",
  "panturrilha_esquerda",
] as const;
const DOBRAS_ORDER = [
  "peitoral",
  "axilar_media",
  "tricipital",
  "subescapular",
  "abdomen",
  "supra_iliaca",
  "coxa",
  "panturrilha",
  "supra_espinhal",
  "biceps",
] as const;

// ---------- Helpers ----------
function absPublic(rel?: string) {
  if (!rel) return null;
  const clean = rel.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", clean);
}
const greatVibesPath =
  absPublic("/fonts/GreatVibes-Regular.ttf") || absPublic("/GreatVibes-Regular.ttf");
if (greatVibesPath && fs.existsSync(greatVibesPath)) {
  try {
    Font.register({ family: "GreatVibes", src: greatVibesPath });
  } catch {}
}
function toFixedPt(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(digits).replace(".", ",");
}
function formatBirth(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR");
}
function labelSexo(s: "M" | "F") {
  return s === "F" ? "feminino" : "masculino";
}
function guessMime(p: string) {
  const l = p.toLowerCase();
  if (l.endsWith(".png")) return "image/png";
  if (l.endsWith(".jpg") || l.endsWith(".jpeg")) return "image/jpeg";
  if (l.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
function fileToDataUri(rel?: string) {
  const full = absPublic(rel);
  if (!full || !fs.existsSync(full)) return null;
  const buf = fs.readFileSync(full);
  return `data:${guessMime(full)};base64,${buf.toString("base64")}`;
}
function hasPositive(v: any) {
  return v !== null && v !== undefined && Number(v) > 0;
}

// ---------- Constantes de página (idênticas ao PDF de Orientações) ----------
// A4 retrato + mesmo respiro lateral (30pt) usado no PDF de Orientações.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_X = 30;
const HEADER_TOP = PAGE_HEIGHT - 20;
const HEADER_LINE_Y = HEADER_TOP - 70;          // linha fina abaixo dos dados
const TITLE_Y = HEADER_LINE_Y - 28.35;          // 1cm abaixo da linha
const CONTENT_TOP = TITLE_Y - 28.35;            // 1cm abaixo do título
const BACKGROUND_OPACITY = 0.15;
const FOOTER_LOGO_OPACITY = 0.15;

// Como @react-pdf trabalha com fluxo top-down (paddingTop), converto os
// valores acima em paddings verticais equivalentes ao layout do PDF de
// Orientações (mesma altura de logo/dados/traço/título).
const PAGE_PADDING_TOP = PAGE_HEIGHT - CONTENT_TOP; // ≈ 761.51 - 720 = 121.51pt

// ---------- Paleta ----------
const INK = "#1a1a1a";
const TITLE_GREEN = "#5a7a4e";
const RULE = "#262626";           // preto do traço (igual ao PDF de Orientações)
const BORDER = "#b9c4ae";
const MUTED = "#8a8f85";
const GREEN_BG = "#e7f3e0";
const GREEN_TXT = "#2e7d32";
const RED_BG = "#fdecea";
const RED_TXT = "#c62828";
const CHART_GREEN = "#7a9b6d";
const CHART_BLUE = "#4a7dbd";
const CHART_RED = "#c62828";

// ---------- Estilos ----------
const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING_TOP,
    paddingBottom: 90,             // reserva espaço p/ rodapé fixo (assinatura + logo)
    paddingHorizontal: PAGE_MARGIN_X,
    fontSize: 8.4,
    color: INK,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  // Fundo cobre a página inteira, respeitando as margens da página.
  bgFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    opacity: BACKGROUND_OPACITY,
  },

  // ============ CABEÇALHO FIXO (igual ao PDF de Orientações) ============
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: PAGE_PADDING_TOP,
  },
  headerLogo: {
    position: "absolute",
    // No PDF de Orientações, o logo é ancorado em y=HEADER_LINE_Y+6 (coord de
    // baixo). Convertendo para top: PAGE_HEIGHT - (HEADER_LINE_Y+6) - altura.
    // targetWidth=68 e a logo é quadrada (mantemos width=height=68).
    top: PAGE_HEIGHT - (HEADER_LINE_Y + 6) - 68,
    left: PAGE_MARGIN_X,
    width: 68,
    height: 68,
    objectFit: "contain",
  },
  headerName: {
    position: "absolute",
    // No PDF de Orientações: y = HEADER_TOP - 28 (baseline). O texto tem 15pt.
    top: PAGE_HEIGHT - HEADER_TOP + 28 - 15,
    left: PAGE_MARGIN_X + 76,
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0d0d0d",
  },
  headerInfoLine1: {
    position: "absolute",
    top: PAGE_HEIGHT - HEADER_TOP + 46 - 10,
    left: PAGE_MARGIN_X + 76,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0d0d0d",
  },
  headerInfoLine2: {
    position: "absolute",
    top: PAGE_HEIGHT - HEADER_TOP + 60 - 10,
    left: PAGE_MARGIN_X + 76,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0d0d0d",
  },
  headerRule: {
    position: "absolute",
    top: PAGE_HEIGHT - HEADER_LINE_Y,
    left: PAGE_MARGIN_X,
    right: PAGE_MARGIN_X,
    height: 1,                    // traço FINO (thickness: 1) igual Orientações
    backgroundColor: RULE,
  },
  headerTitle: {
    position: "absolute",
    // No PDF de Orientações: y = TITLE_Y (baseline), fonte 20 bold.
    top: PAGE_HEIGHT - TITLE_Y - 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0d0d0d",
    letterSpacing: 0,
  },

  // Cards genéricos
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 7,
    paddingTop: 9,
    paddingHorizontal: 11,
    paddingBottom: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  cardTitle: {
    fontSize: 8.6,
    fontWeight: 700,
    color: TITLE_GREEN,
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  cardTitleCentered: {
    fontSize: 8.6,
    fontWeight: 700,
    color: TITLE_GREEN,
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: "center",
  },

  // Bloco topo (tabela + espaço reservado p/ imagens)
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  topLeft: { width: "56%" },
  topRight: { width: "42%", alignItems: "center", justifyContent: "center" },

  // Tabela composição corporal
  ccHead: { flexDirection: "row", paddingBottom: 3, marginBottom: 2 },
  ccHeadTxt: { fontSize: 7.4, color: MUTED, fontWeight: 700 },
  ccRow: { flexDirection: "row", alignItems: "center", paddingVertical: 1.2 },
  ccColParam: { width: "52%", flexDirection: "row", alignItems: "center", paddingLeft: 10 },
  ccColParamText: { fontSize: 8.2, color: INK },
  ccColRes: { width: "24%", fontSize: 8.2, color: INK },
  ccColEval: { width: "24%" },

  pill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.6,
    alignSelf: "flex-start",
    fontSize: 7.2,
    fontWeight: 700,
  },
  pillGreen: { backgroundColor: GREEN_BG, color: GREEN_TXT },
  pillYellow: { backgroundColor: "#fdf6d8", color: "#8a6d00" },
  pillRed: { backgroundColor: RED_BG, color: RED_TXT },
  pillNeutral: { color: MUTED, fontSize: 8 },

  // Espaço reservado para imagens do paciente
  // Reduzido para subir os cards "Composição Corporal" e o card em branco ao
  // lado direito, deixando-os na mesma altura do PDF de referência.
  bodyPlaceholder: { width: 132, height: 150, marginTop: 0 },

  // Evolução info
  evoInfoWrapper: { flexGrow: 1, flexShrink: 1, flexBasis: 0, flexDirection: "column" },
  evoInfoSpacer: { flexGrow: 1 },
  evoInfoRow: { flexDirection: "column", alignItems: "center", marginTop: -12 },
  evoFigure: { width: 66, height: 145, objectFit: "contain", marginBottom: 3 },
  evoFigureSvg: { width: 66, height: 145, marginBottom: 3 },
  // 2 mm acima, conforme o modelo enviado (2 mm = aproximadamente 5,67 pt).
  evoInfoTextWrap: { width: "100%", paddingRight: 0, marginTop: -33.87 },
  evoInfoText: { fontSize: 6.8, color: "#333", lineHeight: 1.25, textAlign: "center" },
  evoNoteBox: {
    backgroundColor: GREEN_BG,
    borderRadius: 5,
    paddingTop: 11,
    paddingBottom: 7,
    paddingHorizontal: 8,
    marginTop: 7,
    marginHorizontal: -2,
    flexDirection: "row",
    alignItems: "center",
  },
  evoNoteIcon: { width: 12, height: 12, marginRight: 5, marginTop: 1 },
  evoNoteTextWrap: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 3, marginTop: -4 },
  evoNoteText: { fontSize: 5.2, color: "#2e4630", lineHeight: 1.3 },

  // Bloco meio (3 cards)
  midRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "stretch", marginBottom: 8 },
  cardMid: {
    width: "32.4%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 7,
    paddingTop: 9,
    paddingHorizontal: 10,
    paddingBottom: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  cardMidEvo: { flexDirection: "column" },
  mHead: { flexDirection: "row", paddingBottom: 3, marginBottom: 2 },
  mHeadTxt: { fontSize: 7.2, color: MUTED, fontWeight: 700 },
  mRow: { flexDirection: "row", alignItems: "center", paddingVertical: 1.4 },
  mColLabel: { width: "52%", flexDirection: "row", alignItems: "center" },
  mColLabelText: { fontSize: 7.9, color: INK },
  mColRes: { width: "24%", fontSize: 7.9, color: INK, textAlign: "center" },

  evoBlock: { marginBottom: 3 },
  evoHead: { flexDirection: "row", alignItems: "center", marginBottom: 2 },

  // Evolução comparativa
  footCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 7,
    paddingTop: 9,
    paddingHorizontal: 11,
    paddingBottom: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    marginBottom: 6,
  },
  footRow: { flexDirection: "row", justifyContent: "space-between" },
  footBox: {
    width: "32.4%",
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  footLabel: { fontSize: 8.8, fontWeight: 700, color: INK, marginBottom: 2 },
  footBig: { fontSize: 13, fontWeight: 800, color: INK },
  footDelta: { fontSize: 7.8, marginTop: 3 },
  footSince: { fontSize: 7, color: MUTED, marginTop: 2 },

  // ============ RODAPÉ FIXO (igual ao PDF de Orientações) ============
  // footerY (Orientações) = 56.  Nome fica em y=footerY+12 (baseline).
  // Convertendo para top: PAGE_HEIGHT - (footerY + 12) - fontSize.
  footerFixed: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  signName: {
    position: "absolute",
    top: PAGE_HEIGHT - (56 + 12) - 18,
    left: PAGE_MARGIN_X,
    fontSize: 18,
    fontFamily: "GreatVibes",
    color: "#1f1f1f",
  },
  signLine: {
    position: "absolute",
    top: PAGE_HEIGHT - (56 + 10),
    left: PAGE_MARGIN_X,
    height: 0.8,
    backgroundColor: "#333",
    // width é definida em tempo de render conforme o comprimento do texto.
  },
  signCrn: {
    position: "absolute",
    top: PAGE_HEIGHT - (56 - 8) - 16,
    left: PAGE_MARGIN_X,
    fontSize: 16,
    fontFamily: "GreatVibes",
    color: "#404040",
  },
  footerLogo: {
    position: "absolute",
    // logo em y=footerY-2 no PDF de Orientações, altura 42 → top = PAGE_HEIGHT - (footerY-2) - 42
    top: PAGE_HEIGHT - (56 - 2) - 42,
    left: PAGE_WIDTH - PAGE_MARGIN_X - 42,
    width: 42,
    height: 42,
    objectFit: "contain",
    opacity: FOOTER_LOGO_OPACITY,
  },
});

// ---------- Componentes ----------
function EvalPill({ cor, label }: { cor?: "verde" | "amarelo"; label?: string }) {
  if (!label) return <Text style={[styles.pill, styles.pillNeutral]}>—</Text>;
  const s = cor === "amarelo" ? styles.pillYellow : styles.pillGreen;
  return <Text style={[styles.pill, s]}>{label}</Text>;
}
function AcimaPill() {
  return <Text style={[styles.pill, styles.pillRed]}>Acima</Text>;
}

function MiniChart({
  title,
  points,
  color,
}: {
  title: string;
  points: Array<{ data: string; value: number | null | undefined }>;
  color: string;
}) {
  const W = 148;
  const H = 44;
  const left = 20;
  const right = 20;
  const top = 10;
  const chartH = 20;
  const chartW = W - left - right;

  const valid = points.filter((p) => hasPositive(p.value));
  const vals = valid.map((p) => Number(p.value));
  const minRaw = vals.length ? Math.min(...vals) : 0;
  const maxRaw = vals.length ? Math.max(...vals) : 1;
  const span = maxRaw - minRaw;
  const pad = span > 0 ? span * 0.35 : Math.max(1, Math.abs(maxRaw) * 0.05);
  const min = minRaw - pad;
  const max = maxRaw + pad;

  const n = Math.max(1, points.length - 1);
  const proj = points.map((p, i) => {
    const x = left + (i * chartW) / n;
    const y = hasPositive(p.value)
      ? top + chartH - ((Number(p.value) - min) / Math.max(0.5, max - min)) * chartH
      : top + chartH / 2;
    return { ...p, x, y };
  });
  const linePts = proj.filter((p) => hasPositive(p.value));

  return (
    <View style={styles.evoBlock}>
      <Text style={{ fontSize: 7.8, fontWeight: 700, color: INK, marginBottom: 1 }}>
        {title}
      </Text>
      <Svg width={W} height={H}>
        {linePts.length >= 2 ? (
          <Polyline
            points={linePts.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke={color}
            strokeWidth={1.1}
            fill="none"
          />
        ) : null}
        {proj.map((p, i) =>
          hasPositive(p.value) ? (
            <Circle key={`c${i}`} cx={p.x} cy={p.y} r={2.1} fill="#fff" stroke={color} strokeWidth={1.1} />
          ) : null
        )}
        {proj.map((p, i) =>
          hasPositive(p.value) ? (
            <Text
              key={`v${i}`}
              x={p.x}
              y={p.y - 5}
              textAnchor="middle"
              style={{ fontSize: 6.4, fill: "#555", fontWeight: 700 }}
            >
              {toFixedPt(Number(p.value))}
            </Text>
          ) : null
        )}
        {proj.map((p, i) => (
          <Text
            key={`d${i}`}
            x={p.x}
            y={H - 3}
            textAnchor="middle"
            style={{ fontSize: 6, fill: "#999" }}
          >
            {p.data}
          </Text>
        ))}
      </Svg>
    </View>
  );
}

function MetricChartIcon({ kind, cx, cy }: { kind: "peso" | "musculo" | "gordura"; cx: number; cy: number }) {
  const stroke = kind === "peso" ? CHART_GREEN : kind === "musculo" ? CHART_BLUE : CHART_RED;
  const fill = kind === "peso" ? "#eaf5e5" : kind === "musculo" ? "#eaf2fc" : "#fdecec";
  return (
    <>
      <Circle cx={cx} cy={cy} r={12} fill={fill} stroke={stroke} strokeWidth={0.6} />
      {kind === "peso" ? (
        <>
          <Rect x={cx - 6} y={cy - 5} width={12} height={10} rx={1.5} fill={stroke} />
          <Circle cx={cx} cy={cy} r={2.5} fill="#fff" />
          <Polyline points={`${cx - 2},${cy - 7} ${cx + 2},${cy - 7}`} stroke={stroke} strokeWidth={1.2} fill="none" />
        </>
      ) : kind === "musculo" ? (
        <>
          <Rect x={cx - 7} y={cy - 1} width={14} height={2} rx={1} fill={stroke} />
          <Rect x={cx - 8} y={cy - 5} width={2.5} height={10} rx={1} fill={stroke} />
          <Rect x={cx + 5.5} y={cy - 5} width={2.5} height={10} rx={1} fill={stroke} />
          <Rect x={cx - 10} y={cy - 3.5} width={2} height={7} rx={1} fill={stroke} />
          <Rect x={cx + 8} y={cy - 3.5} width={2} height={7} rx={1} fill={stroke} />
        </>
      ) : (
        <>
          <Circle cx={cx} cy={cy + 2} r={5.2} fill={stroke} />
          <Polyline points={`${cx},${cy - 8} ${cx - 4.5},${cy - 1} ${cx},${cy - 3} ${cx + 4.5},${cy - 1} ${cx},${cy - 8}`} fill={stroke} stroke={stroke} strokeWidth={0.5} />
          <Circle cx={cx} cy={cy + 1} r={1.4} fill="#fff" />
        </>
      )}
    </>
  );
}


function EvolucaoComparativaChart({
  peso,
  massaMuscular,
  gordura,
}: {
  peso: Array<{ data: string; value: number | null | undefined }>;
  massaMuscular: Array<{ data: string; value: number | null | undefined }>;
  gordura: Array<{ data: string; value: number | null | undefined }>;
}) {
  // Gráfico compacto inspirado no modelo enviado: ícone, valor atual destacado,
  // linha de evolução e valores inicial/final em cada métrica.
  const W = 155;
  const sectionH = 57;
  const plotLeft = 40;
  const plotRight = 151;
  const sections = [
    { title: "Peso (kg)", points: peso, color: CHART_GREEN, kind: "peso" as const },
    { title: "Massa Muscular (kg)", points: massaMuscular, color: CHART_BLUE, kind: "musculo" as const },
    { title: "% de Gordura (%)", points: gordura, color: CHART_RED, kind: "gordura" as const },
  ];

  return (
    <Svg width={W} height={sectionH * sections.length} viewBox={`0 0 ${W} ${sectionH * sections.length}`}>
      {sections.map((section, sectionIndex) => {
        const top = sectionIndex * sectionH;
        const valid = section.points.filter((p) => hasPositive(p.value));
        const first = valid[0];
        const last = valid[valid.length - 1];
        const current = last?.value;
        const values = valid.map((p) => Number(p.value));
        const minRaw = values.length ? Math.min(...values) : 0;
        const maxRaw = values.length ? Math.max(...values) : 1;
        const span = maxRaw - minRaw;
        const pad = span > 0 ? span * 0.35 : Math.max(1, Math.abs(maxRaw) * 0.05);
        const min = minRaw - pad;
        const max = maxRaw + pad;
        const count = Math.max(1, section.points.length - 1);
        const projected = section.points.map((point, index) => {
          const x = plotLeft + (index * (plotRight - plotLeft)) / count;
          const y = top + 32 - (hasPositive(point.value)
            ? ((Number(point.value) - min) / Math.max(0.5, max - min)) * 13
            : 6.5);
          return { ...point, x, y };
        });
        const linePoints = projected.filter((p) => hasPositive(p.value));
        const displayCurrent = hasPositive(current) ? toFixedPt(Number(current)) : "—";
        return (
          <React.Fragment key={section.title}>
            {sectionIndex > 0 ? (
              <Polyline points={`3,${top - 4} ${W - 3},${top - 4}`} stroke="#d7d7d7" strokeWidth={0.5} strokeDasharray="2,2" fill="none" />
            ) : null}
            <MetricChartIcon kind={section.kind} cx={14} cy={top + 27} />
            <Text x={34} y={top + 10} style={{ fontSize: 7.2, fill: INK, fontWeight: 700 }}>{section.title}</Text>
            <Text x={96} y={top + 24} textAnchor="middle" style={{ fontSize: 12, fill: INK, fontWeight: 800 }}>{displayCurrent}</Text>
            {linePoints.length >= 2 ? (
              <Polyline points={linePoints.map((p) => `${p.x},${p.y}`).join(" ")} stroke={section.color} strokeWidth={1.7} fill="none" />
            ) : null}
            {linePoints.map((point, index) => (
              <React.Fragment key={`${section.title}-${index}`}>
                <Circle cx={point.x} cy={point.y} r={2.6} fill="#fff" stroke={section.color} strokeWidth={1.3} />
                <Text x={point.x} y={top + 40} textAnchor="middle" style={{ fontSize: 5.5, fill: INK, fontWeight: 700 }}>{toFixedPt(Number(point.value))}</Text>
                <Text x={point.x} y={top + 51} textAnchor="middle" style={{ fontSize: 5.2, fill: MUTED }}>{point.data}</Text>
              </React.Fragment>
            ))}
            {first && last && first === last ? (
              <>
                <Text x={plotLeft} y={top + 40} textAnchor="middle" style={{ fontSize: 5.5, fill: INK, fontWeight: 700 }}>{toFixedPt(Number(first.value))}</Text>
                <Text x={plotLeft} y={top + 51} textAnchor="middle" style={{ fontSize: 5.2, fill: MUTED }}>{first.data}</Text>
              </>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// Silhueta (usa /public/images/avaliacao/silueta.* se existir; senão SVG).
function SilhuetaImgOrSvg() {
  const silhuetaCandidates = [
    "/images/avaliacao/silueta.png",
    "/images/avaliacao/silueta.jpg",
    "/images/avaliacao/silueta.jpeg",
    "/images/avaliacao/silueta.webp",
    "/images/avaliacao/silueta.png.jpg",
    "/images/avaliacao/silueta.jpg.png",
  ];
  let silhuetaUri: string | null = null;
  for (const rel of silhuetaCandidates) {
    silhuetaUri = fileToDataUri(rel);
    if (silhuetaUri) break;
  }
  if (silhuetaUri) {
    return <Image src={silhuetaUri} style={styles.evoFigure} />;
  }
  const VERDE = "#8fae7f";
  const VERDE_CLARO = "#c2d6b5";
  return (
    <Svg width={44} height={96} viewBox="0 0 100 220" style={styles.evoFigureSvg}>
      <Circle cx={50} cy={20} r={13} fill={VERDE} />
      <Rect x={35} y={38} width={30} height={72} rx={12} fill={VERDE} />
      <Rect x={19} y={42} width={11} height={62} rx={5.5} fill={VERDE_CLARO} />
      <Rect x={70} y={42} width={11} height={62} rx={5.5} fill={VERDE_CLARO} />
      <Rect x={36} y={112} width={12} height={100} rx={6} fill={VERDE} />
      <Rect x={52} y={112} width={12} height={100} rx={6} fill={VERDE} />
    </Svg>
  );
}

function GraficoIconeSvg() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" style={styles.evoNoteIcon}>
      <Rect x={1} y={8} width={3} height={6} rx={0.6} fill="#5a7a4e" />
      <Rect x={5.5} y={5} width={3} height={9} rx={0.6} fill="#5a7a4e" />
      <Rect x={10} y={2} width={3} height={12} rx={0.6} fill="#5a7a4e" />
    </Svg>
  );
}

function EvolucaoInfoCard() {
  return (
    <View style={styles.evoInfoWrapper}>
      <View style={styles.evoInfoRow}>
        <SilhuetaImgOrSvg />
        <View style={styles.evoInfoTextWrap}>
          <Text
            style={styles.evoInfoText}
            hyphenationCallback={(word) => [word]}
          >
            Acompanhe aqui seus resultados ao longo do tempo, com base nos{"\n"}parâmetros{"\n"}avaliados.
          </Text>
        </View>
      </View>

      <View style={styles.evoInfoSpacer} />

      <View style={styles.evoNoteBox}>
        <GraficoIconeSvg />
        <View style={styles.evoNoteTextWrap}>
          <Text
            style={styles.evoNoteText}
            hyphenationCallback={(word) => [word]}
          >
            Na sua próxima avaliação, este espaço exibirá um gráfico com a sua evolução de peso, massa muscular e % de gordura.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------- Documento ----------
export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/layouts/fundo-layout.jpg") || fileToDataUri("/fundo-layout.jpg");
  const previous = dados.previousSummary || null;

  const historicoSel = (dados.evolucaoHistorico || []).filter((h) =>
    (dados.evolucaoSelecionadaIds || []).includes(h.id)
  );
  let evolucao: EvolucaoPonto[];
  if (dados.compareResults && historicoSel.length > 0) {
    const atual = (dados.evolucao || []).slice(-1);
    evolucao = [...historicoSel.slice(-3), ...atual];
  } else {
    evolucao = (dados.evolucao || []).slice(-1);
  }
  const showEvoCard = dados.compareResults && evolucao.length > 1;
  const pesoPontos = evolucao.map((p) => ({ data: p.data, value: p.peso }));
  const musculoPontos = evolucao.map((p) => ({ data: p.data, value: p.massaMuscular }));
  const bfPontos = evolucao.map((p) => ({ data: p.data, value: p.bfPct }));

  const circRows = CIRC_ORDER.map((k) => ({
    key: k,
    label: CIRC_LABELS[k],
    atual: dados.currentCircunferencias?.[k],
    antes: dados.previousCircunferencias?.[k],
  }));
  const dobraRows = DOBRAS_ORDER.map((k) => ({
    key: k,
    label: DOBRAS_LABELS[k],
    atual: dados.currentDobras?.[k],
    antes: dados.previousDobras?.[k],
  }));
  const valorOu = (v: any) => (hasPositive(v) ? toFixedPt(v) : "—");

  const base = previous;
  const dPeso = base?.pesoKg != null ? dados.pesoKg - Number(base.pesoKg) : null;
  const dMM = base?.massaMuscularKg != null ? dados.massaMagraKg - Number(base.massaMuscularKg) : null;
  const dBF = base?.bodyFatPct != null ? dados.bfPct - Number(base.bodyFatPct) : null;
  const desde = dados.dataAvaliacaoInicial
    ? `desde ${new Date(dados.dataAvaliacaoInicial).toLocaleDateString("pt-BR")}`
    : "";

  // Cálculo da largura do traço da assinatura (mesma lógica do PDF de Orientações:
  // linha acompanha exatamente o comprimento do texto "Nutricionista: {nome}").
  const nomeBase = (nutricionista?.nome || "").trim();
  const fullNutriText = nomeBase ? `Nutricionista: ${nomeBase}` : "Nutricionista:";
  // Estimativa de largura em GreatVibes 18pt (~0.42 * fontSize por char).
  const estWidth = Math.min(
    fullNutriText.length * 18 * 0.42,
    PAGE_WIDTH - PAGE_MARGIN_X * 2 - 70
  );

  const crnRodape = (nutricionista?.crn ? `CRN: ${nutricionista.crn}` : "CRN:").trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fundo cobrindo a página inteira */}
        {fundo ? <Image src={fundo} style={styles.bgFixed} fixed /> : null}

        {/* ============ CABEÇALHO FIXO ============ */}
        <View style={styles.headerFixed} fixed>
          {logo ? <Image src={logo} style={styles.headerLogo} /> : null}
          <Text style={styles.headerName}>{paciente.nome}</Text>
          <Text style={styles.headerInfoLine1}>
            {`nascimento: ${formatBirth(paciente.nascimento)} | peso: ${toFixedPt(dados.pesoKg)}kg`}
          </Text>
          <Text style={styles.headerInfoLine2}>
            {`altura: ${toFixedPt(paciente.altura_cm, 0)}cm | sexo: ${labelSexo(paciente.sexo)}`}
          </Text>
          <View style={styles.headerRule} />
          <Text style={styles.headerTitle}>AVALIAÇÃO FÍSICA</Text>
        </View>

        {/* ============ BLOCO TOPO: 2 CARDS ============ */}
        <View style={styles.topRow}>
          {/* Card esquerdo — tabela COMPOSIÇÃO CORPORAL */}
          <View style={[styles.card, styles.topLeft]}>
            <Text style={styles.cardTitle}>COMPOSIÇÃO CORPORAL</Text>

            <View style={styles.ccHead}>
              <Text style={[styles.ccHeadTxt, { width: "52%", paddingLeft: 10 }]}>Parâmetro</Text>
              <Text style={[styles.ccHeadTxt, { width: "24%" }]}>Resultado</Text>
              <Text style={[styles.ccHeadTxt, { width: "24%" }]}>Avaliação</Text>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Peso</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.pesoKg)} kg</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>% de água corporal</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.pctAgua)} %</Text>
              <View style={styles.ccColEval}>
                <EvalPill
                  cor={dados.classificacaoAgua?.cor}
                  label={dados.classificacaoAgua?.label || "Adequado"}
                />
              </View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Massa muscular</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <View style={styles.ccColEval}><EvalPill cor={dados.classificacaoMassaMuscular?.cor} label={dados.classificacaoMassaMuscular?.label} /></View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Músculo esquelético</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.imme, 2)} kg/m²</Text>
              <View style={styles.ccColEval}><EvalPill cor={dados.classificacaoImme?.cor} label={dados.classificacaoImme?.label} /></View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Massa livre de gordura</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <View style={styles.ccColEval}>
                <EvalPill cor={dados.classificacaoFfmi?.cor} label={dados.classificacaoFfmi?.label} />
              </View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Massa adiposa</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.img, 2)} kg/m²</Text>
              <View style={styles.ccColEval}><EvalPill cor={dados.classificacaoMassaAdiposa?.cor} label={dados.classificacaoMassaAdiposa?.label} /></View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Índice de massa gorda</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.img, 2)} kg/m²</Text>
              <View style={styles.ccColEval}>
                {dados.classificacaoImg?.label ? (
                  <EvalPill cor={dados.classificacaoImg.cor} label={dados.classificacaoImg.label} />
                ) : (
                  <AcimaPill />
                )}
              </View>
            </View>

            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>% de gordura</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.bfPct)} %</Text>
              <View style={styles.ccColEval}>
                {dados.classificacaoGordura?.label ? (
                  <EvalPill cor={dados.classificacaoGordura.cor} label={dados.classificacaoGordura.label} />
                ) : (
                  <AcimaPill />
                )}
              </View>
            </View>
          </View>

          {/* Card direito — espaço reservado para imagens do paciente */}
          <View style={[styles.card, styles.topRight]}>
            <View style={styles.bodyPlaceholder} />
          </View>
        </View>

        {/* ============ BLOCO MEIO: 3 CARDS ============ */}
        <View style={styles.midRow}>
          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>CIRCUNFERÊNCIAS (cm)</Text>
            <View style={styles.mHead}>
              <Text style={[styles.mHeadTxt, { width: "52%" }]}>Medida</Text>
              <Text style={[styles.mHeadTxt, { width: "24%", textAlign: "center" }]}>Antes</Text>
              <Text style={[styles.mHeadTxt, { width: "24%", textAlign: "center" }]}>Atual</Text>
            </View>
            {circRows.map((r) => (
              <View key={r.key} style={styles.mRow}>
                <View style={styles.mColLabel}>
                  <Text style={styles.mColLabelText}>{r.label}</Text>
                </View>
                <Text style={styles.mColRes}>{valorOu(r.antes)}</Text>
                <Text style={styles.mColRes}>{valorOu(r.atual)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>DOBRAS CUTÂNEAS (mm)</Text>
            <View style={styles.mHead}>
              <Text style={[styles.mHeadTxt, { width: "52%" }]}>Dobra</Text>
              <Text style={[styles.mHeadTxt, { width: "24%", textAlign: "center" }]}>Antes</Text>
              <Text style={[styles.mHeadTxt, { width: "24%", textAlign: "center" }]}>Atual</Text>
            </View>
            {dobraRows.map((r) => (
              <View key={r.key} style={styles.mRow}>
                <View style={styles.mColLabel}>
                  <Text style={styles.mColLabelText}>{r.label}</Text>
                </View>
                <Text style={styles.mColRes}>{valorOu(r.antes)}</Text>
                <Text style={styles.mColRes}>{valorOu(r.atual)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.cardMid, styles.cardMidEvo]}>
            <Text style={styles.cardTitle}>EVOLUÇÃO</Text>
            {showEvoCard ? (
              <>
                <EvolucaoComparativaChart
                  peso={pesoPontos}
                  massaMuscular={musculoPontos}
                  gordura={bfPontos}
                />
              </>
            ) : (
              <EvolucaoInfoCard />
            )}
          </View>
        </View>

        {/* ============ EVOLUÇÃO COMPARATIVA ============ */}
        <View style={styles.footCard}>
          <Text style={styles.cardTitle}>EVOLUÇÃO COMPARATIVA</Text>
          <View style={styles.footRow}>
            <View style={styles.footBox}>
              <Text style={styles.footLabel}>Peso</Text>
              <Text style={styles.footBig}>{toFixedPt(dados.pesoKg)} kg</Text>
              {dPeso !== null ? (
                <Text style={[styles.footDelta, { color: dPeso <= 0 ? GREEN_TXT : RED_TXT }]}>
                  {dPeso > 0 ? "+" : ""}
                  {toFixedPt(dPeso)} kg
                </Text>
              ) : (
                <Text style={styles.footDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footSince}>{desde}</Text> : null}
            </View>

            <View style={styles.footBox}>
              <Text style={[styles.footLabel, { color: CHART_BLUE }]}>Massa Muscular</Text>
              <Text style={styles.footBig}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              {dMM !== null ? (
                <Text style={[styles.footDelta, { color: dMM >= 0 ? GREEN_TXT : RED_TXT }]}>
                  {dMM > 0 ? "+" : ""}
                  {toFixedPt(dMM)} kg
                </Text>
              ) : (
                <Text style={styles.footDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footSince}>{desde}</Text> : null}
            </View>

            <View style={styles.footBox}>
              <Text style={[styles.footLabel, { color: CHART_RED }]}>% de Gordura</Text>
              <Text style={styles.footBig}>{toFixedPt(dados.bfPct)} %</Text>
              {dBF !== null ? (
                <Text style={[styles.footDelta, { color: dBF <= 0 ? GREEN_TXT : RED_TXT }]}>
                  {dBF > 0 ? "+" : ""}
                  {toFixedPt(dBF)} %
                </Text>
              ) : (
                <Text style={styles.footDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footSince}>{desde}</Text> : null}
            </View>
          </View>
        </View>

        {/* ============ RODAPÉ FIXO (idêntico ao PDF de Orientações) ============ */}
        <View style={styles.footerFixed} fixed>
          <Text style={styles.signName}>{fullNutriText}</Text>
          <View style={[styles.signLine, { width: estWidth }]} />
          <Text style={styles.signCrn}>{crnRodape}</Text>
          {logo ? <Image src={logo} style={styles.footerLogo} /> : null}
        </View>
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
