// lib/avaliacaoPdf.tsx
// Layout do PDF de Avaliação Física — reproduz o mock 1:1.
//
// Página A4 retrato (595.28 x 841.89 pt).
// Margens laterais generosas (~40pt cada) para dar o "respiro" das laterais.
// Ordem vertical (mesma do mock):
//   1) Cabeçalho: logo + nome/nascimento/peso/altura/sexo   (~ topo)
//   2) Régua fina verde-escura
//   3) Título "AVALIAÇÃO FÍSICA" em PRETO, centralizado (sem subtítulo)
//   4) Bloco superior: card COMPOSIÇÃO CORPORAL (tabela) + card COMPOSIÇÃO CORPORAL (imagem)
//   5) Bloco médio: CIRCUNFERÊNCIAS | DOBRAS CUTÂNEAS (mm) | EVOLUÇÃO
//   6) Card EVOLUÇÃO COMPARATIVA (3 caixinhas: Peso / Massa Muscular / % Gordura)
//   7) Assinatura em fonte manuscrita GreatVibes + logo pequena à direita
//
// Emojis dos parâmetros conforme aba Antropometria:
//   💪 Massa muscular · 🔥 % Gordura · 💧 Água · 🏋️ Músculo esquelético · 📏 IMG

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
  supra_iliaca: "Supra-ilíaca",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
  supra_espinhal: "Supra espinhal",
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
function pct(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return ((a - b) / b) * 100;
}

// ---------- Paleta ----------
const TITLE_BLACK = "#000000";
const CARD_TITLE = "#3f5b34";   // verde escuro dos títulos dos cards
const RULE = "#6f7c5d";         // régua fina
const BORDER = "#d6dcc8";       // borda cinza-esverdeada suave dos cards
const TEXT = "#111111";
const MUTED = "#6b7280";
const GREEN_BG = "#d9f2c8";
const GREEN_TXT = "#166534";
const YELLOW_BG = "#fff2b8";
const YELLOW_TXT = "#a16207";
const RED_BG = "#fde2e2";
const RED_TXT = "#b91c1c";
const BLUE = "#2563eb";
const GREEN_LINE = "#3f5b34";

// ---------- Estilos ----------
const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 30,
    paddingHorizontal: 40, // margens laterais do mock
    fontSize: 8.6,
    color: TEXT,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05 },

  // Cabeçalho
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  headerText: { flexGrow: 1 },
  patientName: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  patientMeta: { fontSize: 8.4, color: "#334", marginTop: 2 },
  rule: { height: 0.8, backgroundColor: RULE, marginTop: 8, marginBottom: 14 },

  title: {
    fontSize: 22,
    fontWeight: 800,
    textAlign: "center",
    color: TITLE_BLACK,
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // Bloco topo (2 cards)
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  cardCompLeft: { width: "62%" },
  cardCompRight: {
    width: "36%",
    alignItems: "center",
    justifyContent: "center",
    padding: 4, // menos padding p/ a imagem preencher o card sem alterar sua largura
  },

  cardTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: CARD_TITLE,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  cardTitleCentered: {
    fontSize: 9,
    fontWeight: 700,
    color: CARD_TITLE,
    marginBottom: 8,
    letterSpacing: 0.6,
    textAlign: "center",
  },

  // Tabela de composição corporal (4 colunas)
  ccHead: {
    flexDirection: "row",
    paddingBottom: 4,
    marginBottom: 2,
  },
  ccHeadTxt: { fontSize: 7.8, color: MUTED, fontWeight: 700 },
  ccRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  ccColParam: { width: "40%", flexDirection: "row", alignItems: "center", gap: 6 },
  ccColParamText: { fontSize: 8.4, color: TEXT },
  ccColRes: { width: "22%", fontSize: 8.4, color: TEXT },
  ccColRef: { width: "18%", fontSize: 8.4, color: "#334" },
  ccColEval: { width: "20%" },

  emoji: { fontSize: 9.2, width: 12 },

  pill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    fontSize: 7.4,
    fontWeight: 700,
  },
  pillGreen: { backgroundColor: GREEN_BG, color: GREEN_TXT },
  pillYellow: { backgroundColor: YELLOW_BG, color: YELLOW_TXT },
  pillRed: { backgroundColor: RED_BG, color: RED_TXT },
  pillNeutral: { color: MUTED, fontSize: 8, paddingHorizontal: 0 },

  bodyFront: {
    // Preenche o card 2 sem alterar as dimensões do card.
    // O card tem 36% da largura útil (~ 187pt) e mesma altura do card 1.
    width: "100%",
    height: 300,
    objectFit: "contain",
    marginTop: 0,
  },

  // Meio (3 cards)
  midRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  cardMid: {
    width: "32.66%", // 3 cards + 2 gaps de 8pt caber em 100%
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#ffffff",
  },

  mHead: { flexDirection: "row", paddingBottom: 4, marginBottom: 2 },
  mHeadTxt: { fontSize: 7.8, color: MUTED, fontWeight: 700 },
  mRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3.2,
  },
  mColLabel: { width: "48%", flexDirection: "row", alignItems: "center", gap: 6 },
  mColLabelText: { fontSize: 8.2, color: TEXT },
  mColAntes: { width: "26%", fontSize: 8.2, color: TEXT, textAlign: "center" },
  mColAtual: { width: "26%", fontSize: 8.2, color: TEXT, textAlign: "center" },

  // Evolução mini-charts
  evoBlock: { marginBottom: 8 },
  evoTitle: { fontSize: 8, color: TEXT, marginBottom: 2, flexDirection: "row", alignItems: "center", gap: 4 },

  // Rodapé comparativo
  footCard: {
    borderWidth: 0.8,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  footRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  footBox: {
    flexGrow: 1,
    width: "32%",
    borderWidth: 0.6,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  footLabel: { fontSize: 9, color: TEXT, fontWeight: 700, marginBottom: 4, flexDirection: "row", alignItems: "center" },
  footBig: { fontSize: 15, fontWeight: 800, color: TEXT },
  footDelta: { fontSize: 8, marginTop: 3 },
  footSince: { fontSize: 7.4, color: MUTED, marginTop: 2 },

  signWrap: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signName: { fontSize: 16, fontFamily: "GreatVibes", color: "#111" },
  signCrn: { fontSize: 12, fontFamily: "GreatVibes", color: "#111", marginTop: 2 },
  footerLogo: { width: 34, height: 34, objectFit: "contain" },
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
  emoji,
  points,
  color,
  suffix = "",
}: {
  title: string;
  emoji: string;
  points: Array<{ data: string; value: number | null | undefined }>;
  color: string;
  suffix?: string;
}) {
  const width = 150;
  const height = 62;
  const left = 14;
  const right = 14;
  const top = 6;
  const chartH = 30;
  const chartW = width - left - right;

  const filtered = points.filter((p) => hasPositive(p.value));
  const vals = filtered.map((p) => Number(p.value));
  const minRaw = vals.length ? Math.min(...vals) : 0;
  const maxRaw = vals.length ? Math.max(...vals) : 1;
  const pad = Math.max(0.8, (maxRaw - minRaw) * 0.25 || 0.8);
  const min = minRaw - pad;
  const max = maxRaw + pad;

  const projected = points.map((p, i) => {
    const x = left + (i * chartW) / Math.max(1, points.length - 1);
    const y = hasPositive(p.value)
      ? top + chartH - ((Number(p.value) - min) / Math.max(0.5, max - min)) * chartH
      : top + chartH / 2;
    return { ...p, x, y };
  });
  const linePts = projected.filter((p) => hasPositive(p.value));

  return (
    <View style={styles.evoBlock}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 1 }}>
        <Text style={{ fontSize: 8 }}>{emoji}</Text>
        <Text style={{ fontSize: 8, color: TEXT, fontWeight: 700 }}>{title}</Text>
      </View>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={4} ry={4} fill="#fafcf6" />
        {linePts.length >= 2 ? (
          <Polyline
            points={linePts.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke={color}
            strokeWidth={1.2}
            fill="none"
          />
        ) : null}
        {projected.map((p, i) => (
          <React.Fragment key={i}>
            {hasPositive(p.value) ? <Circle cx={p.x} cy={p.y} r={2.2} fill={color} /> : null}
          </React.Fragment>
        ))}
      </Svg>
      {/* Rótulos de valor e data como texto abaixo do SVG para não conflitar */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: left - 6, marginTop: -32 }}>
        {projected.map((p, i) => (
          <Text key={i} style={{ fontSize: 6.6, color: TEXT, fontWeight: 700 }}>
            {hasPositive(p.value) ? `${toFixedPt(Number(p.value))}${suffix}` : ""}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: left - 6, marginTop: 14 }}>
        {projected.map((p, i) => (
          <Text key={i} style={{ fontSize: 6.6, color: MUTED }}>
            {p.data}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------- Documento ----------
export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/fundo-layout.jpg") || fileToDataUri("/layouts/fundo-layout.jpg");
  const frente = fileToDataUri(dados.imagemFrenteUrl);
  const compare = Boolean(dados.compareResults);
  const previous = dados.previousSummary || null;

  const refAgua = paciente.sexo === "F" ? "50 – 65 %" : "50 – 65 %";
  const refBf = paciente.sexo === "F" ? "20 – 30 %" : "16 – 28 %";

  const evolucao = (dados.evolucao || []).slice(-3);
  const pesoPontos = evolucao.map((p) => ({ data: p.data, value: p.peso }));
  const musculoPontos = evolucao.map((p) => ({ data: p.data, value: p.massaMuscular }));
  const bfPontos = evolucao.map((p) => ({ data: p.data, value: p.bfPct }));

  // Circunf / Dobras – linhas apenas onde há algum dado (antes OU atual)
  const circRows = CIRC_ORDER.map((k) => ({
    key: k,
    label: CIRC_LABELS[k],
    atual: dados.currentCircunferencias?.[k],
    antes: dados.previousCircunferencias?.[k],
  })).filter((r) => hasPositive(r.atual) || hasPositive(r.antes));
  const dobraRows = DOBRAS_ORDER.map((k) => ({
    key: k,
    label: DOBRAS_LABELS[k],
    atual: dados.currentDobras?.[k],
    antes: dados.previousDobras?.[k],
  })).filter((r) => hasPositive(r.atual) || hasPositive(r.antes));

  // Comparativos vs 1ª avaliação
  const base = previous || null;
  const dPeso = base?.pesoKg != null ? dados.pesoKg - Number(base.pesoKg) : null;
  const dMM = base?.massaMuscularKg != null ? dados.massaMagraKg - Number(base.massaMuscularKg) : null;
  const dBF = base?.bodyFatPct != null ? dados.bfPct - Number(base.bodyFatPct) : null;
  const pPeso = base?.pesoKg ? pct(dados.pesoKg, Number(base.pesoKg)) : null;
  const pMM = base?.massaMuscularKg ? pct(dados.massaMagraKg, Number(base.massaMuscularKg)) : null;
  const pBF = base?.bodyFatPct ? pct(dados.bfPct, Number(base.bodyFatPct)) : null;
  const desde = dados.dataAvaliacaoInicial
    ? `desde ${new Date(dados.dataAvaliacaoInicial).toLocaleDateString("pt-BR")}`
    : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {fundo ? <Image src={fundo} style={styles.bg} /> : null}

        {/* ============ CABEÇALHO ============ */}
        <View style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <View style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.patientName}>{paciente.nome}</Text>
            <Text style={styles.patientMeta}>
              nascimento: {formatBirth(paciente.nascimento)} | peso: {toFixedPt(dados.pesoKg)}kg
            </Text>
            <Text style={styles.patientMeta}>
              altura: {toFixedPt(paciente.altura_cm, 0)}cm | sexo: {labelSexo(paciente.sexo)}
            </Text>
          </View>
        </View>
        <View style={styles.rule} />

        {/* ============ TÍTULO ============ */}
        <Text style={styles.title}>AVALIAÇÃO FÍSICA</Text>

        {/* ============ BLOCO TOPO: 2 CARDS ============ */}
        <View style={styles.topRow}>
          {/* Card esquerdo — tabela */}
          <View style={[styles.card, styles.cardCompLeft]}>
            <Text style={styles.cardTitle}>COMPOSIÇÃO CORPORAL</Text>

            {/* Cabeçalho das 4 colunas */}
            <View style={styles.ccHead}>
              <Text style={[styles.ccHeadTxt, { width: "40%" }]}>Parâmetro</Text>
              <Text style={[styles.ccHeadTxt, { width: "22%" }]}>Resultado</Text>
              <Text style={[styles.ccHeadTxt, { width: "18%" }]}>Referência</Text>
              <Text style={[styles.ccHeadTxt, { width: "20%" }]}>Avaliação</Text>
            </View>

            {/* Peso */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Peso</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.pesoKg)} kg</Text>
              <Text style={styles.ccColRef}>—</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* % de água corporal */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>% de água{"\n"}corporal</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.pctAgua)} %</Text>
              <Text style={styles.ccColRef}>{refAgua}</Text>
              <View style={styles.ccColEval}>
                <EvalPill cor={dados.classificacaoAgua?.cor} label={dados.classificacaoAgua?.label || "Adequado"} />
              </View>
            </View>

            {/* Massa muscular */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Massa{"\n"}muscular</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <Text style={styles.ccColRef}>—</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* Músculo esquelético */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Músculo{"\n"}esquelético</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.imme)} kg</Text>
              <Text style={styles.ccColRef}>—</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* Massa livre de gordura (FFMI) */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Massa livre{"\n"}de gordura</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <Text style={styles.ccColRef}>—</Text>
              <View style={styles.ccColEval}>
                <EvalPill cor={dados.classificacaoFfmi?.cor} label={dados.classificacaoFfmi?.label} />
              </View>
            </View>

            {/* Massa adiposa */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Massa{"\n"}adiposa</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaGordaKg)} kg</Text>
              <Text style={styles.ccColRef}>—</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* Índice de massa gorda */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>Índice de{"\n"}massa gorda</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.img, 2)} kg/m²</Text>
              <Text style={styles.ccColRef}>—</Text>
              <View style={styles.ccColEval}>
                {dados.classificacaoImg?.label ? (
                  <EvalPill cor={dados.classificacaoImg.cor} label={dados.classificacaoImg.label} />
                ) : (
                  <AcimaPill />
                )}
              </View>
            </View>

            {/* % de gordura */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Text style={styles.ccColParamText}>% de gordura</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.bfPct)} %</Text>
              <Text style={styles.ccColRef}>{refBf}</Text>
              <View style={styles.ccColEval}>
                {dados.classificacaoGordura?.label ? (
                  <EvalPill cor={dados.classificacaoGordura.cor} label={dados.classificacaoGordura.label} />
                ) : (
                  <AcimaPill />
                )}
              </View>
            </View>
          </View>

          {/* Card direito — imagem biotipo (sem título, imagem preenche o card) */}
          <View style={[styles.card, styles.cardCompRight]}>
            {frente ? <Image src={frente} style={styles.bodyFront} /> : <View style={styles.bodyFront} />}
          </View>
        </View>

        {/* ============ BLOCO MEIO: 3 CARDS ============ */}
        <View style={styles.midRow}>
          {/* Circunferências */}
          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>CIRCUNFERÊNCIAS</Text>
            <View style={styles.mHead}>
              <Text style={[styles.mHeadTxt, { width: "48%" }]}>Medida</Text>
              <Text style={[styles.mHeadTxt, { width: "26%", textAlign: "center" }]}>Antes</Text>
              <Text style={[styles.mHeadTxt, { width: "26%", textAlign: "center" }]}>Atual</Text>
            </View>
            {circRows.length === 0 ? (
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>—</Text>
            ) : (
              circRows.map((r) => (
                <View key={r.key} style={styles.mRow}>
                  <View style={styles.mColLabel}>
                    <Text style={styles.emoji}>📐</Text>
                    <Text style={styles.mColLabelText}>{r.label}</Text>
                  </View>
                  <Text style={styles.mColAntes}>{hasPositive(r.antes) ? toFixedPt(r.antes) : "—"}</Text>
                  <Text style={styles.mColAtual}>{hasPositive(r.atual) ? toFixedPt(r.atual) : "—"}</Text>
                </View>
              ))
            )}
          </View>

          {/* Dobras */}
          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>DOBRAS CUTÂNEAS (mm)</Text>
            <View style={styles.mHead}>
              <Text style={[styles.mHeadTxt, { width: "48%" }]}>Dobra</Text>
              <Text style={[styles.mHeadTxt, { width: "26%", textAlign: "center" }]}>Antes</Text>
              <Text style={[styles.mHeadTxt, { width: "26%", textAlign: "center" }]}>Atual</Text>
            </View>
            {dobraRows.length === 0 ? (
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>—</Text>
            ) : (
              dobraRows.map((r) => (
                <View key={r.key} style={styles.mRow}>
                  <View style={styles.mColLabel}>
                    <Text style={styles.emoji}>🤏</Text>
                    <Text style={styles.mColLabelText}>{r.label}</Text>
                  </View>
                  <Text style={styles.mColAntes}>{hasPositive(r.antes) ? toFixedPt(r.antes) : "—"}</Text>
                  <Text style={styles.mColAtual}>{hasPositive(r.atual) ? toFixedPt(r.atual) : "—"}</Text>
                </View>
              ))
            )}
          </View>

          {/* Evolução */}
          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>EVOLUÇÃO</Text>
            <MiniChart title="Peso (kg)" emoji="⚖️" points={pesoPontos} color={GREEN_LINE} />
            <MiniChart title="Massa Muscular (kg)" emoji="💪" points={musculoPontos} color={BLUE} />
            <MiniChart title="% de Gordura (%)" emoji="🔥" points={bfPontos} color={RED_TXT} />
          </View>
        </View>

        {/* ============ EVOLUÇÃO COMPARATIVA ============ */}
        <View style={styles.footCard}>
          <Text style={styles.cardTitle}>EVOLUÇÃO COMPARATIVA</Text>
          <View style={styles.footRow}>
            {/* Peso */}
            <View style={styles.footBox}>
              <Text style={styles.footLabel}>⚖️  Peso</Text>
              <Text style={styles.footBig}>{toFixedPt(dados.pesoKg)} kg</Text>
              {dPeso !== null ? (
                <Text style={[styles.footDelta, { color: dPeso <= 0 ? GREEN_TXT : RED_TXT }]}>
                  {dPeso > 0 ? "+" : ""}
                  {toFixedPt(dPeso)} kg ({pPeso !== null && pPeso > 0 ? "+" : ""}
                  {toFixedPt(pPeso ?? 0, 2)}%)
                </Text>
              ) : (
                <Text style={styles.footDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footSince}>{desde}</Text> : null}
            </View>

            {/* Massa muscular */}
            <View style={styles.footBox}>
              <Text style={[styles.footLabel, { color: BLUE }]}>💪  Massa Muscular</Text>
              <Text style={styles.footBig}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              {dMM !== null ? (
                <Text style={[styles.footDelta, { color: dMM >= 0 ? GREEN_TXT : RED_TXT }]}>
                  {dMM > 0 ? "+" : ""}
                  {toFixedPt(dMM)} kg ({pMM !== null && pMM > 0 ? "+" : ""}
                  {toFixedPt(pMM ?? 0, 2)}%)
                </Text>
              ) : (
                <Text style={styles.footDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footSince}>{desde}</Text> : null}
            </View>

            {/* % de Gordura */}
            <View style={styles.footBox}>
              <Text style={[styles.footLabel, { color: RED_TXT }]}>🔥  % de Gordura</Text>
              <Text style={styles.footBig}>{toFixedPt(dados.bfPct)} %</Text>
              {dBF !== null ? (
                <Text style={[styles.footDelta, { color: dBF <= 0 ? GREEN_TXT : RED_TXT }]}>
                  {dBF > 0 ? "+" : ""}
                  {toFixedPt(dBF)} % ({pBF !== null && pBF > 0 ? "+" : ""}
                  {toFixedPt(pBF ?? 0, 2)}%)
                </Text>
              ) : (
                <Text style={styles.footDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footSince}>{desde}</Text> : null}
            </View>
          </View>
        </View>

        {/* ============ ASSINATURA ============ */}
        <View style={styles.signWrap}>
          <View>
            <Text style={styles.signName}>Nutricionista: {nutricionista?.nome || "Nutricionista"}</Text>
            <Text style={styles.signCrn}>CRN: {nutricionista?.crn || "—"}</Text>
          </View>
          {logo ? <Image src={logo} style={styles.footerLogo} /> : <View style={styles.footerLogo} />}
        </View>
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
