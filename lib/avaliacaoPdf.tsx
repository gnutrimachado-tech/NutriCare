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
  Line,
  Circle,
  Rect,
  Polyline,
  Font,
} from "@react-pdf/renderer";

type Classificacao = {
  status?: string;
  cor?: "verde" | "amarelo";
  label?: string;
};

type MeasurementMap = Record<string, number | null | undefined>;

type SummarySnapshot = {
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

type HistoricoPonto = {
  createdAt?: string | null;
  pesoKg?: number | null;
  massaMuscularKg?: number | null;
  bodyFatPct?: number | null;
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
    vo2max?: number | null;
    vo2ClassLabel?: string | null;
    classificacaoAgua?: Classificacao;
    classificacaoImme?: Classificacao;
    classificacaoImg?: Classificacao;
    classificacaoFfmi?: Classificacao;
    classificacaoGordura?: Classificacao;
    imagemUrl?: string;
    imagemFrenteUrl?: string;
    imagemLateralUrl?: string;
    legendaImagem?: string;
    protocolLabel?: string;
    compareResults?: boolean;
    currentDobras?: MeasurementMap;
    currentCircunferencias?: MeasurementMap;
    previousDobras?: MeasurementMap;
    previousCircunferencias?: MeasurementMap;
    previousSummary?: SummarySnapshot | null;
    historicoEvolucao?: HistoricoPonto[];
  };
  nutricionista: {
    nome: string;
    crn: string;
    email?: string;
  };
};

const CIRC_LABELS: Record<string, string> = {
  pescoco: "Pescoço",
  cintura: "Cintura",
  quadril: "Quadril",
  abdomen: "Abdômen",
  peitoral: "Peitoral",
  braco_direito: "Braço direito",
  braco_esquerdo: "Braço esquerdo",
  biceps: "Bíceps",
  biceps_direito: "Braço direito",
  biceps_esquerdo: "Braço esquerdo",
  coxa: "Coxa",
  coxa_direita: "Coxa direita",
  coxa_esquerda: "Coxa esquerda",
  panturrilha: "Panturrilha",
  panturrilha_direita: "Panturrilha direita",
  panturrilha_esquerda: "Panturrilha esquerda",
  axilar_media: "Axilar média",
  supra_espinhal: "Supra espinhal",
};

const DOBRAS_LABELS: Record<string, string> = {
  peitoral: "Peitoral",
  axilar_media: "Axilar média",
  tricipital: "Tricipital",
  subescapular: "Subescapular",
  abdomen: "Abdômen",
  supra_iliaca: "Supra ilíaca",
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
  "biceps_direito",
  "biceps_esquerdo",
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

function absPublic(relPath?: string) {
  if (!relPath) return null;
  const clean = relPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", clean);
}

const greatVibesPath = absPublic("/fonts/GreatVibes-Regular.ttf");
if (greatVibesPath && fs.existsSync(greatVibesPath)) {
  Font.register({ family: "GreatVibes", src: greatVibesPath });
}

function toFixedPt(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
  return Number(value).toFixed(digits).replace(".", ",");
}

function formatBirth(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function labelSexo(sexo: "M" | "F") {
  return sexo === "F" ? "feminino" : "masculino";
}

function guessMime(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function fileToDataUri(relPath?: string) {
  const full = absPublic(relPath);
  if (!full || !fs.existsSync(full)) return null;
  const buf = fs.readFileSync(full);
  return `data:${guessMime(full)};base64,${buf.toString("base64")}`;
}

function resolveImagePair(dados: PdfProps["dados"], sexo: "M" | "F") {
  const frente =
    dados.imagemFrenteUrl ||
    dados.imagemUrl ||
    `/images/avaliacao/${sexo === "F" ? "fem" : "masc"}-frente-1.png.jpg`;

  const lateral =
    dados.imagemLateralUrl ||
    frente.replace("-frente-", "-lateral-") ||
    `/images/avaliacao/${sexo === "F" ? "fem" : "masc"}-lateral-1.png.jpg`;

  return {
    frente: fileToDataUri(frente),
    lateral: fileToDataUri(lateral),
  };
}

function hasPositive(value: number | null | undefined) {
  return value !== null && value !== undefined && Number(value) > 0;
}

function measurementRows(
  order: readonly string[],
  labels: Record<string, string>,
  current?: MeasurementMap,
  previous?: MeasurementMap,
  unit = "cm"
) {
  return order.map((key) => {
    const atual = current?.[key];
    const anterior = previous?.[key];
    return {
      key,
      label: labels[key] || key,
      anteriorTxt: hasPositive(anterior) ? `${toFixedPt(anterior)}` : "-",
      atualTxt: hasPositive(atual) ? `${toFixedPt(atual)}` : "-",
      unit,
    };
  });
}

/* ---------- Cores/estilo ---------- */
const COLOR_TITLE = "#111111";
const COLOR_CARD_BORDER = "#c7d3bd";
const COLOR_CARD_TITLE = "#4b6b3d";
const COLOR_TEXT = "#22331d";
const COLOR_MUTED = "#6b7280";
const COLOR_LINE = "#e6ecdd";

/* ---------- Gráfico de evolução (peso, massa muscular, gordura) ---------- */
function chartMini({
  serie,
  color,
  labelPrefix,
  width = 175,
  height = 62,
}: {
  serie: Array<{ label: string; value: number }>;
  color: string;
  labelPrefix?: string;
  width?: number;
  height?: number;
}) {
  const padL = 12;
  const padR = 8;
  const padT = 14;
  const padB = 12;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const points = serie.filter((p) => Number.isFinite(p.value));
  if (points.length === 0) {
    return (
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={4} ry={4} fill="#ffffff" />
        <Text style={{ position: "absolute", left: padL, top: padT + chartH / 2, fontSize: 6, color: COLOR_MUTED }}>
          Sem dados
        </Text>
      </Svg>
    );
  }
  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const scaleX = (i: number) =>
    padL + (points.length === 1 ? chartW / 2 : (i * chartW) / (points.length - 1));
  const scaleY = (v: number) => padT + chartH - ((v - minV) / range) * chartH;

  const polyline = points.map((p, i) => `${scaleX(i)},${scaleY(p.value)}`).join(" ");
  void labelPrefix;

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="transparent" />
      <Polyline points={polyline} stroke={color} strokeWidth={1.2} fill="none" />
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={scaleX(i)} cy={scaleY(p.value)} r={2.2} fill={color} />
          <Text
            style={{
              position: "absolute",
              left: scaleX(i) - 10,
              top: scaleY(p.value) - 10,
              fontSize: 6,
              color: color,
              fontWeight: 700,
            }}
          >
            {toFixedPt(p.value)}
          </Text>
          <Text
            style={{
              position: "absolute",
              left: scaleX(i) - 10,
              top: padT + chartH + 2,
              fontSize: 5.5,
              color: COLOR_MUTED,
            }}
          >
            {p.label}
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
}

/* ---------- helpers Avaliação (Ótimo/Bom/Atenção) ---------- */
function statusBox(cls?: Classificacao) {
  if (!cls || !cls.label) return null;
  const cor = cls.cor === "amarelo" ? "#f59e0b" : "#16a34a";
  const bg = cls.cor === "amarelo" ? "#fef3c7" : "#dcfce7";
  return (
    <View
      style={{
        borderRadius: 4,
        paddingVertical: 1.5,
        paddingHorizontal: 4,
        backgroundColor: bg,
        alignSelf: "flex-end",
      }}
    >
      <Text style={{ fontSize: 6.5, color: cor, fontWeight: 700 }}>{cls.label}</Text>
    </View>
  );
}

function refText(sexo: "M" | "F", key: "agua" | "gordura" | "img" | "ffmi") {
  if (key === "agua") return sexo === "F" ? "50 – 65 %" : "50 – 65 %";
  if (key === "gordura") return sexo === "F" ? "18 – 28 %" : "10 – 20 %";
  if (key === "img") return sexo === "F" ? "≤ 12 kg/m²" : "≤ 8 kg/m²";
  return "—";
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    fontSize: 7.5,
    color: COLOR_TEXT,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
  },
  /* Header topo */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerLogo: {
    width: 34,
    height: 34,
    objectFit: "contain",
  },
  headerRight: {
    flexGrow: 1,
  },
  headerName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111",
    marginBottom: 1,
  },
  headerMeta: {
    fontSize: 7.5,
    color: "#333",
  },
  headerSep: {
    height: 0.6,
    backgroundColor: "#111",
    marginBottom: 6,
  },
  /* Título */
  titleWrap: {
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: COLOR_TITLE,
    letterSpacing: 1,
  },
  /* Card genérico */
  card: {
    borderWidth: 0.6,
    borderColor: COLOR_CARD_BORDER,
    borderRadius: 8,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  cardTitle: {
    fontSize: 7.5,
    color: COLOR_CARD_TITLE,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  /* Primeira linha: composição corporal (esquerda) + boneco (direita) */
  topWrap: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  compCardLeft: {
    width: "62%",
  },
  compCardRight: {
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
  },
  compHead: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_LINE,
    paddingBottom: 3,
    marginBottom: 2,
  },
  compHeadParam: {
    width: "36%",
    fontSize: 6.6,
    color: COLOR_MUTED,
    fontWeight: 700,
  },
  compHeadResult: {
    width: "22%",
    fontSize: 6.6,
    color: COLOR_MUTED,
    fontWeight: 700,
  },
  compHeadRef: {
    width: "22%",
    fontSize: 6.6,
    color: COLOR_MUTED,
    fontWeight: 700,
  },
  compHeadAval: {
    width: "20%",
    fontSize: 6.6,
    color: COLOR_MUTED,
    fontWeight: 700,
    textAlign: "right",
  },
  compRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2.2,
    borderBottomWidth: 0.3,
    borderBottomColor: "#f1f5eb",
  },
  compParam: {
    width: "36%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  compEmoji: {
    fontSize: 8,
    width: 10,
  },
  compLabel: {
    fontSize: 7,
    color: "#22331d",
  },
  compResult: {
    width: "22%",
    fontSize: 7,
    color: "#111",
    fontWeight: 700,
  },
  compRef: {
    width: "22%",
    fontSize: 6.7,
    color: COLOR_MUTED,
  },
  compAval: {
    width: "20%",
    alignItems: "flex-end",
  },
  bodyImage: {
    width: 120,
    height: 210,
    objectFit: "contain",
  },
  bodyRightTitle: {
    fontSize: 7.5,
    color: COLOR_CARD_TITLE,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
    alignSelf: "center",
  },
  /* Segunda linha: 3 cards (Circ, Dobras, Evolução) */
  midWrap: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  circCard: {
    width: "34%",
  },
  dobrasCard: {
    width: "31%",
  },
  evoCard: {
    width: "35%",
  },
  tHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_LINE,
    paddingBottom: 2,
    marginBottom: 1,
  },
  tHeadLabel: {
    width: "48%",
    fontSize: 6.4,
    color: COLOR_MUTED,
    fontWeight: 700,
  },
  tHeadAntes: {
    width: "26%",
    fontSize: 6.4,
    color: COLOR_MUTED,
    fontWeight: 700,
    textAlign: "center",
  },
  tHeadAtual: {
    width: "26%",
    fontSize: 6.4,
    color: COLOR_MUTED,
    fontWeight: 700,
    textAlign: "center",
  },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1.6,
    borderBottomWidth: 0.3,
    borderBottomColor: "#f1f5eb",
  },
  tRowLabel: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tRowLabelText: {
    fontSize: 6.6,
    color: "#22331d",
  },
  tRowValAntes: {
    width: "26%",
    fontSize: 6.6,
    color: COLOR_MUTED,
    textAlign: "center",
  },
  tRowValAtual: {
    width: "26%",
    fontSize: 6.6,
    color: "#111",
    fontWeight: 700,
    textAlign: "center",
  },
  evoChartWrap: {
    marginBottom: 2,
  },
  evoChartTitle: {
    fontSize: 6.4,
    color: "#22331d",
    fontWeight: 700,
    marginBottom: -2,
  },
  /* Rodapé Evolução Comparativa */
  compareWrap: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  compareCard: {
    width: "33.33%",
    borderWidth: 0.6,
    borderColor: COLOR_CARD_BORDER,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
  },
  compareTitle: {
    fontSize: 7,
    color: COLOR_CARD_TITLE,
    fontWeight: 700,
    marginBottom: 2,
  },
  compareValue: {
    fontSize: 12,
    fontWeight: 800,
    color: "#111",
    marginBottom: 1,
  },
  compareDelta: {
    fontSize: 7,
    color: "#dc2626",
    fontWeight: 700,
  },
  compareDeltaUp: {
    color: "#16a34a",
  },
  compareSince: {
    fontSize: 6.2,
    color: COLOR_MUTED,
    marginTop: 2,
  },
  compareWrapTitle: {
    fontSize: 7.5,
    color: COLOR_CARD_TITLE,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  compareOuter: {
    borderWidth: 0.6,
    borderColor: COLOR_CARD_BORDER,
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
  },
  compareInner: {
    flexDirection: "row",
    gap: 6,
  },
  compareCol: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLOR_LINE,
    borderRadius: 6,
    padding: 5,
    alignItems: "center",
  },
  /* Rodapé assinatura */
  footer: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signature: {
    fontFamily: "GreatVibes",
    fontSize: 13,
    color: "#111",
  },
  crn: {
    fontFamily: "GreatVibes",
    fontSize: 10,
    color: "#111",
    marginTop: 0,
  },
  footerLogo: {
    width: 32,
    height: 32,
    objectFit: "contain",
  },
});

/* ---------- Linhas de composição corporal ---------- */
function CompositionRow({
  emoji,
  label,
  result,
  reference,
  classificacao,
  isImg = false,
}: {
  emoji: string;
  label: string;
  result: string;
  reference: string;
  classificacao?: Classificacao | { label: string; cor: "verde" | "amarelo" };
  isImg?: boolean;
}) {
  const isAlerta =
    isImg && classificacao && (classificacao as Classificacao).cor === "amarelo";
  return (
    <View style={styles.compRow}>
      <View style={styles.compParam}>
        <Text style={styles.compEmoji}>{emoji}</Text>
        <Text style={styles.compLabel}>{label}</Text>
      </View>
      <Text style={styles.compResult}>{result}</Text>
      <Text style={styles.compRef}>{reference}</Text>
      <View style={styles.compAval}>
        {classificacao?.label ? (
          <View
            style={{
              borderRadius: 4,
              paddingVertical: 1.5,
              paddingHorizontal: 4,
              backgroundColor: isAlerta
                ? "#fee2e2"
                : (classificacao as Classificacao).cor === "amarelo"
                ? "#fef3c7"
                : "#dcfce7",
            }}
          >
            <Text
              style={{
                fontSize: 6.5,
                fontWeight: 700,
                color: isAlerta
                  ? "#dc2626"
                  : (classificacao as Classificacao).cor === "amarelo"
                  ? "#b45309"
                  : "#15803d",
              }}
            >
              {classificacao.label}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 7, color: COLOR_MUTED }}>—</Text>
        )}
      </View>
    </View>
  );
}

/* ---------- Componente principal ---------- */
export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/fundo-layout.jpg") || fileToDataUri("/layouts/fundo-layout.jpg");
  const { frente } = resolveImagePair(dados, paciente.sexo);
  const compare = Boolean(dados.compareResults && dados.previousSummary);

  const circRows = measurementRows(
    CIRC_ORDER,
    CIRC_LABELS,
    dados.currentCircunferencias,
    dados.previousCircunferencias,
    "cm"
  );
  const dobraRows = measurementRows(
    DOBRAS_ORDER,
    DOBRAS_LABELS,
    dados.currentDobras,
    dados.previousDobras,
    "mm"
  );

  const historico = (dados.historicoEvolucao && dados.historicoEvolucao.length > 0)
    ? dados.historicoEvolucao
    : (compare && dados.previousSummary
        ? [
            {
              createdAt: dados.previousSummary.createdAt,
              pesoKg: dados.previousSummary.pesoKg,
              massaMuscularKg: dados.previousSummary.massaMuscularKg,
              bodyFatPct: dados.previousSummary.bodyFatPct,
            },
            {
              createdAt: dados.data,
              pesoKg: dados.pesoKg,
              massaMuscularKg: dados.massaMagraKg,
              bodyFatPct: dados.bfPct,
            },
          ]
        : [
            {
              createdAt: dados.data,
              pesoKg: dados.pesoKg,
              massaMuscularKg: dados.massaMagraKg,
              bodyFatPct: dados.bfPct,
            },
          ]);

  const seriePeso = historico.map((h) => ({
    label: formatShortDate(h.createdAt),
    value: Number(h.pesoKg || 0),
  }));
  const serieMassa = historico.map((h) => ({
    label: formatShortDate(h.createdAt),
    value: Number(h.massaMuscularKg || 0),
  }));
  const serieGordura = historico.map((h) => ({
    label: formatShortDate(h.createdAt),
    value: Number(h.bodyFatPct || 0),
  }));

  /* Evolução comparativa (delta vs primeira) */
  const first = historico[0];
  const deltaPeso = first ? Number(dados.pesoKg) - Number(first.pesoKg || dados.pesoKg) : 0;
  const deltaMassa = first ? Number(dados.massaMagraKg) - Number(first.massaMuscularKg || dados.massaMagraKg) : 0;
  const deltaGordura = first ? Number(dados.bfPct) - Number(first.bodyFatPct || dados.bfPct) : 0;
  const pctPeso = first?.pesoKg ? (deltaPeso / Number(first.pesoKg)) * 100 : 0;
  const pctMassa = first?.massaMuscularKg ? (deltaMassa / Number(first.massaMuscularKg)) * 100 : 0;
  const pctGordura = first?.bodyFatPct ? (deltaGordura / Number(first.bodyFatPct)) * 100 : 0;
  const sinceStr = first?.createdAt
    ? new Date(first.createdAt).toLocaleDateString("pt-BR")
    : new Date(dados.data).toLocaleDateString("pt-BR");

  const sexo = paciente.sexo;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {fundo ? <Image src={fundo} style={styles.bg} /> : null}

        {/* Cabeçalho */}
        <View style={styles.headerRow}>
          {logo ? <Image src={logo} style={styles.headerLogo} /> : <View style={styles.headerLogo} />}
          <View style={styles.headerRight}>
            <Text style={styles.headerName}>{paciente.nome}</Text>
            <Text style={styles.headerMeta}>
              nascimento: {formatBirth(paciente.nascimento)} | peso: {toFixedPt(dados.pesoKg)}kg
            </Text>
            <Text style={styles.headerMeta}>
              altura: {toFixedPt(paciente.altura_cm, 0)}cm | sexo: {labelSexo(sexo)}
            </Text>
          </View>
        </View>
        <View style={styles.headerSep} />

        {/* Título */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>AVALIAÇÃO FÍSICA</Text>
        </View>

        {/* Bloco 1: Composição corporal + Boneco */}
        <View style={styles.topWrap}>
          <View style={[styles.card, styles.compCardLeft]}>
            <Text style={styles.cardTitle}>Composição corporal</Text>
            <View style={styles.compHead}>
              <Text style={styles.compHeadParam}>Parâmetro</Text>
              <Text style={styles.compHeadResult}>Resultado</Text>
              <Text style={styles.compHeadRef}>Referência</Text>
              <Text style={styles.compHeadAval}>Avaliação</Text>
            </View>

            <CompositionRow
              emoji="⚖️"
              label="Peso"
              result={`${toFixedPt(dados.pesoKg)} kg`}
              reference="—"
            />
            <CompositionRow
              emoji="💧"
              label="% de água corporal"
              result={`${toFixedPt(dados.pctAgua)} %`}
              reference={refText(sexo, "agua")}
              classificacao={dados.classificacaoAgua}
            />
            <CompositionRow
              emoji="💪"
              label="Massa muscular"
              result={`${toFixedPt(dados.massaMagraKg)} kg`}
              reference="—"
            />
            <CompositionRow
              emoji="🏋️"
              label="Músculo esquelético"
              result={`${toFixedPt(dados.imme, 1)} kg`}
              reference="—"
            />
            <CompositionRow
              emoji="🚶"
              label="Massa livre de gordura"
              result={`${toFixedPt(dados.massaMagraKg)} kg`}
              reference="—"
            />
            <CompositionRow
              emoji="🧈"
              label="Massa adiposa"
              result={`${toFixedPt(dados.massaGordaKg)} kg/m²`}
              reference="—"
            />
            <CompositionRow
              emoji="📏"
              label="Índice de massa gorda"
              result={`${toFixedPt(dados.img, 1)} kg/m²`}
              reference={refText(sexo, "img")}
              classificacao={dados.classificacaoImg}
              isImg
            />
            <CompositionRow
              emoji="🔥"
              label="% de gordura"
              result={`${toFixedPt(dados.bfPct)} %`}
              reference={refText(sexo, "gordura")}
              classificacao={dados.classificacaoGordura}
              isImg
            />
          </View>

          <View style={[styles.card, styles.compCardRight]}>
            <Text style={styles.bodyRightTitle}>Composição corporal</Text>
            {frente ? <Image src={frente} style={styles.bodyImage} /> : <View style={styles.bodyImage} />}
          </View>
        </View>

        {/* Bloco 2: Circunferências | Dobras | Evolução */}
        <View style={styles.midWrap}>
          {/* Circunferências */}
          <View style={[styles.card, styles.circCard]}>
            <Text style={styles.cardTitle}>Circunferências (cm)</Text>
            <View style={styles.tHeadRow}>
              <Text style={styles.tHeadLabel}>Medida</Text>
              {compare ? <Text style={styles.tHeadAntes}>Antes</Text> : null}
              <Text style={styles.tHeadAtual}>{compare ? "Atual" : "Resultado (cm)"}</Text>
            </View>
            {circRows.map((row) => (
              <View style={styles.tRow} key={row.key}>
                <View style={styles.tRowLabel}>
                  <Text style={{ fontSize: 6.5 }}>📐</Text>
                  <Text style={styles.tRowLabelText}>{row.label}</Text>
                </View>
                {compare ? <Text style={styles.tRowValAntes}>{row.anteriorTxt}</Text> : null}
                <Text style={styles.tRowValAtual}>{row.atualTxt}</Text>
              </View>
            ))}
          </View>

          {/* Dobras */}
          <View style={[styles.card, styles.dobrasCard]}>
            <Text style={styles.cardTitle}>Dobras cutâneas (mm)</Text>
            <View style={styles.tHeadRow}>
              <Text style={styles.tHeadLabel}>Dobra</Text>
              {compare ? <Text style={styles.tHeadAntes}>Antes</Text> : null}
              <Text style={styles.tHeadAtual}>{compare ? "Atual" : "Resultado (mm)"}</Text>
            </View>
            {dobraRows.map((row) => (
              <View style={styles.tRow} key={row.key}>
                <View style={styles.tRowLabel}>
                  <Text style={{ fontSize: 6.5 }}>🤏</Text>
                  <Text style={styles.tRowLabelText}>{row.label}</Text>
                </View>
                {compare ? <Text style={styles.tRowValAntes}>{row.anteriorTxt}</Text> : null}
                <Text style={styles.tRowValAtual}>{row.atualTxt}</Text>
              </View>
            ))}
          </View>

          {/* Evolução (3 mini gráficos) */}
          <View style={[styles.card, styles.evoCard]}>
            <Text style={styles.cardTitle}>Evolução</Text>

            <View style={styles.evoChartWrap}>
              <Text style={styles.evoChartTitle}>⚖️ Peso (kg)</Text>
              {chartMini({ serie: seriePeso, color: "#16a34a" })}
            </View>

            <View style={styles.evoChartWrap}>
              <Text style={[styles.evoChartTitle, { color: "#2563eb" }]}>💪 Massa Muscular (kg)</Text>
              {chartMini({ serie: serieMassa, color: "#2563eb" })}
            </View>

            <View style={styles.evoChartWrap}>
              <Text style={[styles.evoChartTitle, { color: "#dc2626" }]}>🔥 % de Gordura (%)</Text>
              {chartMini({ serie: serieGordura, color: "#dc2626" })}
            </View>
          </View>
        </View>

        {/* Bloco 3: Evolução Comparativa */}
        <View style={styles.compareOuter}>
          <Text style={styles.compareWrapTitle}>Evolução comparativa</Text>
          <View style={styles.compareInner}>
            <View style={styles.compareCol}>
              <Text style={styles.compareTitle}>⚖️ Peso</Text>
              <Text style={styles.compareValue}>{toFixedPt(dados.pesoKg)} kg</Text>
              <Text
                style={[
                  styles.compareDelta,
                  ...(deltaPeso > 0 ? [styles.compareDeltaUp] : []),
                ]}
              >
                {deltaPeso >= 0 ? "+" : ""}
                {toFixedPt(deltaPeso)} kg ({deltaPeso >= 0 ? "+" : ""}
                {toFixedPt(pctPeso, 2)}%)
              </Text>
              <Text style={styles.compareSince}>desde {sinceStr}</Text>
            </View>

            <View style={styles.compareCol}>
              <Text style={[styles.compareTitle, { color: "#2563eb" }]}>💪 Massa Muscular</Text>
              <Text style={styles.compareValue}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <Text
                style={[
                  styles.compareDelta,
                  ...(deltaMassa >= 0 ? [styles.compareDeltaUp] : []),
                ]}
              >
                {deltaMassa >= 0 ? "+" : ""}
                {toFixedPt(deltaMassa)} kg ({deltaMassa >= 0 ? "+" : ""}
                {toFixedPt(pctMassa, 2)}%)
              </Text>
              <Text style={styles.compareSince}>desde {sinceStr}</Text>
            </View>

            <View style={styles.compareCol}>
              <Text style={[styles.compareTitle, { color: "#dc2626" }]}>🔥 % de Gordura</Text>
              <Text style={styles.compareValue}>{toFixedPt(dados.bfPct)} %</Text>
              <Text
                style={[
                  styles.compareDelta,
                  ...(deltaGordura <= 0 ? [styles.compareDeltaUp] : []),
                ]}
              >
                {deltaGordura >= 0 ? "+" : ""}
                {toFixedPt(deltaGordura)} % ({deltaGordura >= 0 ? "+" : ""}
                {toFixedPt(pctGordura, 2)}%)
              </Text>
              <Text style={styles.compareSince}>desde {sinceStr}</Text>
            </View>
          </View>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.signature}>
              Nutricionista: {nutricionista?.nome || "Nutricionista"}
            </Text>
            <Text style={styles.crn}>CRN: {nutricionista?.crn || "-"}</Text>
          </View>
          {logo ? <Image src={logo} style={styles.footerLogo} /> : <View style={styles.footerLogo} />}
        </View>

        {/* Suprime warning de var não usada */}
        {(() => { void statusBox; return null; })()}
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
