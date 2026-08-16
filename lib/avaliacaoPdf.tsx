// lib/avaliacaoPdf.tsx
// Layout do PDF de Avaliação Física — reproduz o mock 1:1.
//
// Página A4 retrato (595.28 x 841.89 pt) com margens laterais de 44pt
// (o "respiro" marcado em vermelho no mock).
// Ordem vertical (mesma do mock):
//   1) Cabeçalho: logo + "Nutricare" | nome/nascimento/peso/altura/sexo
//   2) Régua escura fina
//   3) Título "AVALIAÇÃO FÍSICA" (serifado, preto, centralizado)
//   4) Subtítulo "Composição Corporal" (serifado, centralizado)
//   5) Bloco superior: card COMPOSIÇÃO CORPORAL (tabela) + card com a figura
//   6) Bloco médio: CIRCUNFERÊNCIAS | DOBRAS CUTÂNEAS (mm) | EVOLUÇÃO
//   7) Card EVOLUÇÃO COMPARATIVA (3 caixas: Peso / Massa Muscular / % Gordura)
//   8) Assinatura GreatVibes sublinhada + logo pequena à direita

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
// Mesma ordem e mesma quantidade de linhas do mock (11 circunf., 10 dobras)
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
const INK = "#1a1a1a";          // preto suave dos textos
const TITLE_GREEN = "#5a7a4e";  // títulos dos cards (verde-oliva do mock)
const RULE = "#3c3c3c";         // régua escura sob o cabeçalho
const BORDER = "#b9c4ae";       // borda verde-acinzentada dos cards
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
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 44, // respiro lateral do mock (rabisco vermelho)
    fontSize: 8.4,
    color: INK,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 },
  bgFixed: { position: "absolute", top: -30, left: -44, width: 595.28 + 88, height: 841.89 + 56, opacity: 0.18 },

  // Cabeçalho
  header: { flexDirection: "row", alignItems: "center" },
  logoBox: { width: 60, alignItems: "center", marginRight: 10 },
  logo: { width: 58, height: 58, objectFit: "contain" },
  logoText: {
    fontSize: 9,
    color: "#3e5c34",
    fontFamily: "Times-Roman",
    marginTop: 1,
    letterSpacing: 0.5,
  },
  headerText: { flexGrow: 1 },
  patientName: {
    fontSize: 14.5,
    fontWeight: 700,
    color: INK,
    fontFamily: "Times-Roman",
  },
  patientMeta: { fontSize: 8.6, color: "#333", marginTop: 2 },
  rule: { height: 1.1, backgroundColor: RULE, marginTop: 8, marginBottom: 12 },

  // Título / subtítulo
  title: {
    fontSize: 20,
    fontFamily: "Times-Bold",
    textAlign: "center",
    color: "#000",
    letterSpacing: 1.4,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: "Times-Italic",
    textAlign: "center",
    color: "#333",
    marginTop: 2,
    marginBottom: 8,
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

  // Bloco topo (tabela + figura) — biotipo ampliado após remoção da coluna Referência
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  topLeft: { width: "57%" },
  topRight: { width: "41%", alignItems: "center" },

  // Tabela composição corporal
  ccHead: { flexDirection: "row", paddingBottom: 3, marginBottom: 2 },
  ccHeadTxt: { fontSize: 7.4, color: MUTED, fontWeight: 700 },
  ccRow: { flexDirection: "row", alignItems: "center", paddingVertical: 1.2 },
  ccColParam: { width: "52%", flexDirection: "row", alignItems: "center" },
  ccIcon: { width: 13 },
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

  bodyFront: { width: 132, height: 216, objectFit: "contain", marginTop: 4 },

  // Bloco meio (3 cards)
  midRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
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
  mHead: { flexDirection: "row", paddingBottom: 3, marginBottom: 2 },
  mHeadTxt: { fontSize: 7.2, color: MUTED, fontWeight: 700 },
  mRow: { flexDirection: "row", alignItems: "center", paddingVertical: 1.4 },
  mColLabel: { width: "52%", flexDirection: "row", alignItems: "center" },
  mColLabelText: { fontSize: 7.9, color: INK },
  mColRes: { width: "24%", fontSize: 7.9, color: INK, textAlign: "center" },

  // Evolução (mini-charts)
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

  // Assinatura — mesmo tamanho/espaçamento dos outros PDFs (plano, orientações,
  // lista de compras): nome GreatVibes 18, linha acompanhando o texto, CRN 16,
  // logo 42 com opacidade 0.15.
  signWrap: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signCol: {},
  signName: { fontSize: 18, fontFamily: "GreatVibes", color: "#1f1f1f" },
  signLine: { height: 0.8, backgroundColor: "#333", marginTop: 1, width: 240 },
  signCrn: { fontSize: 16, fontFamily: "GreatVibes", color: "#404040", marginTop: 3 },
  footerLogoBox: { alignItems: "center", opacity: 0.15 },
  footerLogo: { width: 42, height: 42, objectFit: "contain" },
  footerLogoText: { fontSize: 7, color: "#3e5c34", fontFamily: "Times-Roman", marginTop: 1 },
});

// Marcador colorido (substitui emoji, que não renderiza no react-pdf)
function Dot({ color }: { color: string }) {
  return (
    <Svg width={9} height={9} style={{ marginRight: 4, marginTop: 1 }}>
      <Circle cx={4.5} cy={4.5} r={3.4} fill={color} />
    </Svg>
  );
}

// ---------- Componentes ----------
function EvalPill({ cor, label }: { cor?: "verde" | "amarelo"; label?: string }) {
  if (!label) return <Text style={[styles.pill, styles.pillNeutral]}>—</Text>;
  const s = cor === "amarelo" ? styles.pillYellow : styles.pillGreen;
  return <Text style={[styles.pill, s]}>{label}</Text>;
}
function AcimaPill() {
  return <Text style={[styles.pill, styles.pillRed]}>Acima</Text>;
}

// Mini-gráfico de evolução (mesmo padrão visual do mock: valor acima do
// ponto, linha fina colorida, data abaixo — tudo dentro do próprio SVG,
// sem colisão de labels).
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

  // Com 1 ponto, centraliza (x = meio do gráfico); com 2+, distribui.
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

// ---------- Documento ----------
export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/layouts/fundo-layout.jpg") || fileToDataUri("/fundo-layout.jpg");
  // Biotipo: usa a versão com traço reforçado (mesma arte, contorno mais visível)
  const frente = fileToDataUri(
    dados.imagemFrenteUrl
      ? dados.imagemFrenteUrl.replace("/images/avaliacao/", "/images/avaliacao-forte/")
      : undefined
  );
  const previous = dados.previousSummary || null;

  // Evolução: responde às caixas de seleção da aba Antropometria.
  // - Nenhuma avaliação marcada ("somente a primeira"): gráfico mostra só a atual.
  // - 1 ou 2 marcadas: gráfico mostra as marcadas + a atual (até 3 pontos).
  const historicoSel = (dados.evolucaoHistorico || []).filter((h) =>
    (dados.evolucaoSelecionadaIds || []).includes(h.id)
  );
  let evolucao: EvolucaoPonto[];
  if (dados.compareResults && historicoSel.length > 0) {
    const atual = (dados.evolucao || []).slice(-1);
    evolucao = [...historicoSel.slice(-2), ...atual];
  } else {
    evolucao = (dados.evolucao || []).slice(-1);
  }
  const showEvoCard = dados.compareResults && evolucao.length > 1;
  const pesoPontos = evolucao.map((p) => ({ data: p.data, value: p.peso }));
  const musculoPontos = evolucao.map((p) => ({ data: p.data, value: p.massaMuscular }));
  const bfPontos = evolucao.map((p) => ({ data: p.data, value: p.bfPct }));

  // Todas as linhas do mock, sempre visíveis; "—" quando não medido
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

  // Comparativos vs 1ª avaliação
  const base = previous;
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
        {fundo ? <Image src={fundo} style={styles.bgFixed} fixed /> : null}

        {/* ============ CABEÇALHO ============ */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {logo ? <Image src={logo} style={styles.logo} /> : <View style={styles.logo} />}
          </View>
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
        <Text style={styles.subtitle}>Composição Corporal</Text>

        {/* ============ BLOCO TOPO: 2 CARDS ============ */}
        <View style={styles.topRow}>
          {/* Card esquerdo — tabela */}
          <View style={[styles.card, styles.topLeft]}>
            <Text style={styles.cardTitle}>COMPOSIÇÃO CORPORAL</Text>

            <View style={styles.ccHead}>
              <Text style={[styles.ccHeadTxt, { width: "52%" }]}>Parâmetro</Text>
              <Text style={[styles.ccHeadTxt, { width: "24%" }]}>Resultado</Text>
              <Text style={[styles.ccHeadTxt, { width: "24%" }]}>Avaliação</Text>
            </View>

            {/* Peso */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#8a8f85" />
                <Text style={styles.ccColParamText}>Peso</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.pesoKg)} kg</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* % de água corporal */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#4a90c2" />
                <Text style={styles.ccColParamText}>% de água{"\n"}corporal</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.pctAgua)} %</Text>
              <View style={styles.ccColEval}>
                <EvalPill
                  cor={dados.classificacaoAgua?.cor}
                  label={dados.classificacaoAgua?.label || "Adequado"}
                />
              </View>
            </View>

            {/* Massa muscular */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#7a9b6d" />
                <Text style={styles.ccColParamText}>Massa{"\n"}muscular</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* Músculo esquelético */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#5a7a4e" />
                <Text style={styles.ccColParamText}>Músculo{"\n"}esquelético</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.imme)} kg</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* Massa livre de gordura */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#a8b39a" />
                <Text style={styles.ccColParamText}>Massa livre{"\n"}de gordura</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <View style={styles.ccColEval}>
                <EvalPill cor={dados.classificacaoFfmi?.cor} label={dados.classificacaoFfmi?.label} />
              </View>
            </View>

            {/* Massa adiposa */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#b08954" />
                <Text style={styles.ccColParamText}>Massa{"\n"}adiposa</Text>
              </View>
              <Text style={styles.ccColRes}>{toFixedPt(dados.imme, 2)} kg/m²</Text>
              <View style={styles.ccColEval}><EvalPill /></View>
            </View>

            {/* Índice de massa gorda */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#8a8f85" />
                <Text style={styles.ccColParamText}>Índice de{"\n"}massa gorda</Text>
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

            {/* % de gordura */}
            <View style={styles.ccRow}>
              <View style={styles.ccColParam}>
                <Dot color="#c62828" />
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

          {/* Card direito — figura do biotipo */}
          <View style={[styles.card, styles.topRight]}>
            <Text style={styles.cardTitleCentered}>COMPOSIÇÃO CORPORAL</Text>
            {frente ? <Image src={frente} style={styles.bodyFront} /> : <View style={styles.bodyFront} />}
          </View>
        </View>

        {/* ============ BLOCO MEIO: 3 CARDS ============ */}
        <View style={styles.midRow}>
          {/* Circunferências — duas colunas: Antes (avaliação anterior) / Atual */}
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

          {/* Dobras — duas colunas: Antes (avaliação anterior) / Atual */}
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

          {/* Evolução — 3 mini-gráficos (só quando a comparação está ativa e há
              avaliações marcadas nas caixas de seleção da aba Antropometria) */}
          {showEvoCard ? (
            <View style={styles.cardMid}>
              <Text style={styles.cardTitle}>EVOLUÇÃO</Text>
              <MiniChart title="Peso (kg)" points={pesoPontos} color={CHART_GREEN} />
              <MiniChart title="Massa Muscular (kg)" points={musculoPontos} color={CHART_BLUE} />
              <MiniChart title="% de Gordura (%)" points={bfPontos} color={CHART_RED} />
            </View>
          ) : null}
        </View>

        {/* ============ EVOLUÇÃO COMPARATIVA ============ */}
        <View style={styles.footCard}>
          <Text style={styles.cardTitle}>EVOLUÇÃO COMPARATIVA</Text>
          <View style={styles.footRow}>
            {/* Peso */}
            <View style={styles.footBox}>
              <Text style={styles.footLabel}>Peso</Text>
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
              <Text style={[styles.footLabel, { color: CHART_BLUE }]}>Massa Muscular</Text>
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
              <Text style={[styles.footLabel, { color: CHART_RED }]}>% de Gordura</Text>
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
          <View style={styles.signCol}>
            <Text style={styles.signName}>Nutricionista: {nutricionista?.nome || "Nutricionista"}</Text>
            <View style={styles.signLine} />
            <Text style={styles.signCrn}>CRN: {nutricionista?.crn || "—"}</Text>
          </View>
          <View style={styles.footerLogoBox}>
            {logo ? <Image src={logo} style={styles.footerLogo} /> : <View style={styles.footerLogo} />}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
