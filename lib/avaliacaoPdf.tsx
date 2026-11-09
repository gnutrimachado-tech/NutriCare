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
  Font,
} from "@react-pdf/renderer";

type Classificacao = {
  status?: string;
  cor?: "verde" | "amarelo";
  label?: string;
  referencia?: string;
};

type MeasurementMap = Record<string, number | null | undefined>;

type SummarySnapshot = {
  pesoKg?: number | null;
  bodyFatPct?: number | null;
  massaMuscularKg?: number | null;
  massaMuscularEsqueleticaKg?: number | null;
  massaAdiposaKg?: number | null;
  aguaPct?: number | null;
  imme?: number | null;
  img?: number | null;
  ffmi?: number | null;
  createdAt?: string | null;
  dataAvaliacao?: string | null;
  protocolLabel?: string | null;
};

type EvolutionPoint = {
  id?: string | null;
  data?: string | null;
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
    massaMuscularEsqueleticaKg?: number;
    massaGordaKg: number;
    bfPct: number;
    imme: number;
    img: number;
    ffmi: number;
    vo2max?: number | null;
    vo2ClassLabel?: string | null;
    classificacaoAgua?: Classificacao | null;
    classificacaoImme?: Classificacao;
    classificacaoImg?: Classificacao;
    classificacaoMassaMuscular?: Classificacao;
    classificacaoMassaLivre?: Classificacao;
    classificacaoMassaAdiposa?: Classificacao;
    classificacaoGordura?: Classificacao;
    classificacaoFfmi?: Classificacao;
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
    evolucao?: EvolutionPoint[];
    evolucaoHistorico?: EvolutionPoint[];
    evolucaoSelecionadaIds?: string[];
    evolucaoAtual?: EvolutionPoint | null;
    evolucaoAtualId?: string | null;
    dataAvaliacaoAtual?: string | null;
    dataAvaliacaoInicial?: string | null;
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
  axilar_media: "Axilar média",
  supra_espinhal: "Supra espinhal",
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
  tricipital: "Tricipital",
  subescapular: "Subescapular",
  axilar_media: "Axilar média",
  supra_iliaca: "Supra-ilíaca",
  abdomen: "Abdominal",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
  biceps: "Bíceps",
  peitoral: "Peitoral",
  supra_espinhal: "Supra espinhal",
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
  "biceps",
  "supra_espinhal",
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
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function formatAssessmentDate(value?: string | null) {
  if (!value) return "Atual";
  const text = String(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[1]}/${br[2]}/${br[3]}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}/${date.getUTCFullYear()}`;
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
  compare = false
) {
  const base = order.map((key) => {
    const atual = current?.[key];
    const anterior = previous?.[key];
    return {
      key,
      label: labels[key] || key,
      anterior,
      atual,
      anteriorTxt: hasPositive(anterior) ? toFixedPt(anterior) : "—",
      atualTxt: hasPositive(atual) ? toFixedPt(atual) : "—",
    };
  });

  return compare
    ? base.filter((row) => hasPositive(row.anterior) || hasPositive(row.atual))
    : base;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_X = 30;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const HAS_GREAT_VIBES = Boolean(greatVibesPath && fs.existsSync(greatVibesPath));

const styles = StyleSheet.create({
  page: {
    position: "relative",
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#242824",
    backgroundColor: "#ffffff",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    opacity: 0.14,
  },
  header: {
    position: "absolute",
    top: 20,
    left: PAGE_MARGIN_X,
    width: CONTENT_WIDTH,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
    marginRight: 16,
  },
  headerText: {
    flexGrow: 1,
    justifyContent: "center",
  },
  patientName: {
    fontSize: 14.4,
    fontWeight: 700,
    color: "#111111",
    marginBottom: 4,
  },
  patientMeta: {
    fontSize: 9.1,
    lineHeight: 1.35,
    color: "#202020",
  },
  headerRule: {
    position: "absolute",
    top: 89,
    left: PAGE_MARGIN_X,
    width: CONTENT_WIDTH,
    height: 0.8,
    backgroundColor: "#303a30",
  },
  title: {
    position: "absolute",
    top: 98,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 800,
    color: "#111111",
  },
  card: {
    position: "absolute",
    borderWidth: 0.8,
    borderColor: "#8a9880",
    borderRadius: 7,
    paddingTop: 9,
    paddingHorizontal: 10,
    paddingBottom: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  cardTitle: {
    fontSize: 8.6,
    fontWeight: 700,
    color: "#526c49",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  compositionCard: {
    top: 146,
    left: PAGE_MARGIN_X,
    width: 353,
    height: 198,
  },
  bodyCard: {
    top: 146,
    left: PAGE_MARGIN_X + 361,
    width: CONTENT_WIDTH - 361,
    height: 198,
  },
  compositionHead: {
    flexDirection: "row",
    paddingBottom: 3,
    marginBottom: 2,
  },
  compositionHeadText: {
    fontSize: 6.8,
    fontWeight: 700,
    color: "#777f73",
  },
  compositionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 19,
    paddingVertical: 2,
  },
  compositionLabel: {
    width: "42%",
    paddingRight: 3,
    fontSize: 7.5,
    color: "#252925",
  },
  compositionReference: {
    width: "21%",
    paddingRight: 2,
    fontSize: 7.1,
    color: "#4b5149",
  },
  compositionResult: {
    width: "20%",
    paddingRight: 2,
    fontSize: 7.6,
    color: "#242824",
  },
  compositionEval: {
    width: "17%",
    alignItems: "flex-start",
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.3,
    fontSize: 6.4,
    lineHeight: 1.15,
    fontWeight: 700,
  },
  pillGreen: {
    backgroundColor: "#e4f1e2",
    color: "#34723a",
  },
  pillYellow: {
    backgroundColor: "#fbf2cf",
    color: "#8a6d00",
  },
  bodyTitle: {
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  bodyImage: {
    width: "100%",
    height: 166,
    objectFit: "contain",
    alignSelf: "center",
  },
  middleCard: {
    top: 348,
    width: 171.7,
    height: 211,
  },
  circumferenceCard: {
    left: PAGE_MARGIN_X,
  },
  foldsCard: {
    left: PAGE_MARGIN_X + 181.7,
  },
  evolutionCard: {
    left: PAGE_MARGIN_X + 363.4,
  },
  measurementHead: {
    flexDirection: "row",
    paddingBottom: 3,
    marginBottom: 2,
    marginTop: 2,
  },
  measurementHeadText: {
    fontSize: 7,
    fontWeight: 700,
    color: "#777f73",
  },
  measurementRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 13.6,
    paddingVertical: 1,
  },
  measurementLabel: {
    width: "52%",
    paddingRight: 2,
    fontSize: 7.4,
    color: "#252925",
  },
  measurementValue: {
    width: "24%",
    fontSize: 7.4,
    color: "#252925",
    textAlign: "center",
  },
  evolutionIntro: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  evolutionIntroTop: {
    alignItems: "center",
    marginTop: 7,
  },
  evolutionFigures: {
    width: 74,
    height: 54,
    marginBottom: 4,
  },
  evolutionIntroText: {
    fontSize: 8.4,
    lineHeight: 1.2,
    color: "#3d403c",
    textAlign: "center",
  },
  evolutionNote: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 7,
    marginHorizontal: -4,
    borderRadius: 5,
    backgroundColor: "#e8f2e4",
  },
  evolutionNoteIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  evolutionNoteText: {
    flexGrow: 1,
    fontSize: 6.6,
    lineHeight: 1.2,
    color: "#435a3e",
    textAlign: "center",
  },
  trendBlock: {
    marginBottom: 4,
  },
  trendHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  trendTitle: {
    fontSize: 7.3,
    fontWeight: 700,
    color: "#2f352e",
  },
  trendValue: {
    fontSize: 7,
    fontWeight: 700,
    color: "#3e6d43",
  },
  trendChart: {
    width: 146,
    height: 20,
    alignSelf: "center",
  },
  trendDates: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -1,
  },
  trendDate: {
    fontSize: 5.7,
    color: "#838a80",
  },
  comparisonCard: {
    top: 563,
    left: PAGE_MARGIN_X,
    width: CONTENT_WIDTH,
    height: 87,
    paddingTop: 8,
    paddingHorizontal: 11,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comparisonBox: {
    width: "32.4%",
    minHeight: 54,
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: "center",
    borderWidth: 0.7,
    borderColor: "#a5aea0",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  comparisonLabel: {
    fontSize: 8.3,
    fontWeight: 700,
    color: "#232823",
    marginBottom: 1,
  },
  comparisonValue: {
    fontSize: 12.3,
    fontWeight: 800,
    color: "#181b18",
  },
  comparisonDelta: {
    fontSize: 7.2,
    marginTop: 2,
  },
  comparisonChart: {
    width: 116,
    height: 23,
    marginTop: 2,
  },
  footerLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
  signature: {
    position: "absolute",
    top: PAGE_HEIGHT - 56 - 30,
    left: PAGE_MARGIN_X,
    fontSize: 17,
    color: "#222222",
    fontFamily: HAS_GREAT_VIBES ? "GreatVibes" : "Helvetica-Oblique",
  },
  signatureRule: {
    position: "absolute",
    top: PAGE_HEIGHT - 56 - 6,
    left: PAGE_MARGIN_X,
    height: 0.7,
    backgroundColor: "#333333",
  },
  crn: {
    position: "absolute",
    top: PAGE_HEIGHT - 56 - 3,
    left: PAGE_MARGIN_X,
    fontSize: 15,
    color: "#3c3c3c",
    fontFamily: HAS_GREAT_VIBES ? "GreatVibes" : "Helvetica-Oblique",
  },
  footerLogo: {
    position: "absolute",
    top: PAGE_HEIGHT - 54 - 42,
    left: PAGE_WIDTH - PAGE_MARGIN_X - 42,
    width: 42,
    height: 42,
    objectFit: "contain",
    opacity: 0.16,
  },
});

function EvaluationPill({ classification }: { classification?: Classificacao | null }) {
  if (!classification?.label) return null;
  return (
    <Text
      style={[
        styles.pill,
        classification.cor === "amarelo" ? styles.pillYellow : styles.pillGreen,
      ]}
    >
      {classification.label}
    </Text>
  );
}

function CompositionRow({
  label,
  reference,
  result,
  classification,
}: {
  label: string;
  reference?: string;
  result: string;
  classification?: Classificacao | null;
}) {
  return (
    <View style={styles.compositionRow}>
      <Text style={styles.compositionLabel}>{label}</Text>
      <Text style={styles.compositionReference}>{reference ?? "—"}</Text>
      <Text style={styles.compositionResult}>{result}</Text>
      <View style={styles.compositionEval}>
        <EvaluationPill classification={classification} />
      </View>
    </View>
  );
}

function MeasurementCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; anteriorTxt: string; atualTxt: string }>;
}) {
  return (
    <>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.measurementHead}>
        <Text style={[styles.measurementHeadText, { width: "52%" }]}>
          {title.startsWith("DOBRAS") ? "Dobra" : "Medida"}
        </Text>
        <Text style={[styles.measurementHeadText, { width: "24%", textAlign: "center" }]}>
          Antes
        </Text>
        <Text style={[styles.measurementHeadText, { width: "24%", textAlign: "center" }]}>
          Atual
        </Text>
      </View>
      {rows.map((row) => (
        <View style={styles.measurementRow} key={row.key}>
          <Text style={styles.measurementLabel}>{row.label}</Text>
          <Text style={styles.measurementValue}>{row.anteriorTxt}</Text>
          <Text style={styles.measurementValue}>{row.atualTxt}</Text>
        </View>
      ))}
    </>
  );
}

function PersonFigures() {
  return (
    <Svg width={74} height={54} viewBox="0 0 120 90" style={styles.evolutionFigures}>
      <Circle cx={36} cy={15} r={8} fill="#121212" />
      <Rect x={27} y={25} width={18} height={31} rx={7} fill="#121212" />
      <Rect x={18} y={27} width={7} height={28} rx={3.5} fill="#121212" />
      <Rect x={47} y={27} width={7} height={28} rx={3.5} fill="#121212" />
      <Rect x={29} y={54} width={7} height={29} rx={3.5} fill="#121212" />
      <Rect x={38} y={54} width={7} height={29} rx={3.5} fill="#121212" />
      <Circle cx={80} cy={15} r={8} fill="#121212" />
      <Rect x={71} y={25} width={18} height={31} rx={7} fill="#121212" />
      <Rect x={62} y={27} width={7} height={28} rx={3.5} fill="#121212" />
      <Rect x={91} y={27} width={7} height={28} rx={3.5} fill="#121212" />
      <Rect x={73} y={54} width={7} height={29} rx={3.5} fill="#121212" />
      <Rect x={82} y={54} width={7} height={29} rx={3.5} fill="#121212" />
    </Svg>
  );
}

function ChartBarsIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" style={styles.evolutionNoteIcon}>
      <Rect x={1} y={9} width={3} height={6} rx={0.5} fill="#5b7d50" />
      <Rect x={6} y={5} width={3} height={10} rx={0.5} fill="#5b7d50" />
      <Rect x={11} y={1} width={3} height={14} rx={0.5} fill="#5b7d50" />
    </Svg>
  );
}

function EvolutionIntro() {
  return (
    <View style={styles.evolutionIntro}>
      <View style={styles.evolutionIntroTop}>
        <PersonFigures />
        <Text style={styles.evolutionIntroText}>
          Acompanhe aqui seus resultados ao longo do tempo, com base nos parâmetros avaliados
        </Text>
      </View>
      <View style={styles.evolutionNote}>
        <ChartBarsIcon />
        <Text style={styles.evolutionNoteText}>
          Na sua próxima avaliação, este espaço exibirá um gráfico com sua evolução de peso,
          massa muscular e % de gordura
        </Text>
      </View>
    </View>
  );
}

type ChartPoint = { label: string; weight: number; muscle: number; fat: number };

function buildChartSeries(
  dados: PdfProps["dados"],
  muscleMassKg: number,
  alturaCm: number
): ChartPoint[] {
  const selectedIds = new Set(dados.evolucaoSelecionadaIds || []);
  const chartValue = (value: number | null | undefined) =>
    value === null || value === undefined ? Number.NaN : Number(value);
  const selectedHistory = (dados.evolucaoHistorico || [])
    .filter((point) => point.id && selectedIds.has(point.id))
    .map((point) => ({
      label: formatAssessmentDate(point.data),
      weight: chartValue(point.peso),
      muscle: chartValue(point.massaMuscular),
      fat: chartValue(point.bfPct),
    }))
    .filter(
      (point) =>
        hasPositive(point.weight) ||
        hasPositive(point.muscle) ||
        (Number.isFinite(point.fat) && point.fat >= 0)
    );

  const fallback = dados.previousSummary;
  const fallbackMuscle = skeletalMuscleFromSummary(fallback, alturaCm);
  const history = selectedHistory.length
    ? selectedHistory
    : dados.compareResults && fallback
      ? [
          {
            label: formatAssessmentDate(fallback.dataAvaliacao || fallback.createdAt),
            weight: chartValue(fallback.pesoKg),
            muscle: chartValue(fallbackMuscle),
            fat: chartValue(fallback.bodyFatPct),
          },
        ]
      : [];

  const current = dados.evolucaoAtual;
  return [
    ...history,
    {
      label: formatAssessmentDate(dados.dataAvaliacaoAtual || current?.data || dados.data),
      weight: Number(current?.peso ?? dados.pesoKg),
      muscle: Number(current?.massaMuscular ?? muscleMassKg),
      fat: Number(current?.bfPct ?? dados.bfPct),
    },
  ];
}

function skeletalMuscleFromSummary(
  summary: SummarySnapshot | null | undefined,
  alturaCm: number
) {
  if (hasPositive(summary?.massaMuscularEsqueleticaKg)) {
    return Number(summary?.massaMuscularEsqueleticaKg);
  }
  if (hasPositive(summary?.massaMuscularKg)) {
    return Number(summary?.massaMuscularKg) * 0.45;
  }
  if (hasPositive(summary?.imme) && alturaCm > 0) {
    return Number(summary?.imme) * (alturaCm / 100) ** 2;
  }
  return null;
}

function EvolutionTrend({
  title,
  color,
  values,
}: {
  title: string;
  color: string;
  values: Array<{ label: string; value: number }>;
}) {
  const valid = values.filter((point) => Number.isFinite(point.value));
  const width = 146;
  const height = 20;
  const left = 6;
  const right = width - 6;
  const min = valid.length ? Math.min(...valid.map((point) => point.value)) : 0;
  const max = valid.length ? Math.max(...valid.map((point) => point.value)) : 1;
  const range = Math.max(max - min, Math.abs(max) * 0.08, 1);
  const plotted = valid.map((point, index) => ({
    ...point,
    x: valid.length === 1 ? width / 2 : left + ((right - left) * index) / (valid.length - 1),
    y: 15 - ((point.value - min) / range) * 10,
  }));

  return (
    <View style={styles.trendBlock}>
      <View style={styles.trendHeading}>
        <Text style={styles.trendTitle}>{title}</Text>
        {valid.length ? (
          <Text style={[styles.trendValue, { color }]}>{toFixedPt(valid[valid.length - 1].value)}</Text>
        ) : null}
      </View>
      <Svg width={width} height={height} style={styles.trendChart}>
        <Line x1={left} y1={15} x2={right} y2={15} stroke="#e2e8df" strokeWidth={1.5} />
        {plotted.slice(1).map((point, index) => (
          <Line
            key={`line-${index}`}
            x1={plotted[index].x}
            y1={plotted[index].y}
            x2={point.x}
            y2={point.y}
            stroke={color}
            strokeWidth={1.4}
          />
        ))}
        {plotted.map((point, index) => (
          <Circle
            key={`dot-${index}`}
            cx={point.x}
            cy={point.y}
            r={2}
            fill="#ffffff"
            stroke={color}
            strokeWidth={1.1}
          />
        ))}
      </Svg>
      <View style={styles.trendDates}>
        <Text style={styles.trendDate}>{valid[0]?.label || ""}</Text>
        <Text style={styles.trendDate}>{valid[valid.length - 1]?.label || ""}</Text>
      </View>
    </View>
  );
}

function ComparisonBox({
  label,
  value,
  unit,
  delta,
  points,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  delta: number | null;
  points: Array<{ label: string; value: number }>;
  color: string;
}) {
  const valid = points.filter((point) => Number.isFinite(point.value));
  const isGoodChange = label === "Massa muscular" ? Number(delta) > 0 : Number(delta) < 0;
  const deltaColor =
    delta === null ? "#7b8178" : delta === 0 || isGoodChange ? "#34723a" : "#b63e35";
  const deltaLabel =
    delta === null
      ? "—"
      : `${delta > 0 ? "+" : ""}${toFixedPt(delta)} ${unit}`;

  return (
    <View style={styles.comparisonBox}>
      <Text style={[styles.comparisonLabel, { color }]}>{label}</Text>
      <Text style={styles.comparisonValue}>
        {toFixedPt(value)} {unit}
      </Text>
      <Text style={[styles.comparisonDelta, { color: deltaColor }]}>{deltaLabel}</Text>
      {valid.length > 1 ? (
        <Svg width={116} height={23} style={styles.comparisonChart}>
          <Line x1={5} y1={19} x2={111} y2={19} stroke="#e5e7eb" strokeWidth={0.7} />
          {valid.slice(1).map((point, index) => {
            const min = Math.min(...valid.map((item) => item.value));
            const max = Math.max(...valid.map((item) => item.value));
            const range = Math.max(max - min, Math.abs(max) * 0.08, 1);
            const x1 = 5 + (106 * index) / Math.max(1, valid.length - 1);
            const x2 = 5 + (106 * (index + 1)) / Math.max(1, valid.length - 1);
            const y1 = 16 - ((valid[index].value - min) / range) * 11;
            const y2 = 16 - ((point.value - min) / range) * 11;
            return (
              <Line
                key={`comparison-line-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={1.2}
              />
            );
          })}
          {valid.map((point, index) => {
            const min = Math.min(...valid.map((item) => item.value));
            const max = Math.max(...valid.map((item) => item.value));
            const range = Math.max(max - min, Math.abs(max) * 0.08, 1);
            return (
              <Circle
                key={`comparison-dot-${index}`}
                cx={5 + (106 * index) / Math.max(1, valid.length - 1)}
                cy={16 - ((point.value - min) / range) * 11}
                r={1.7}
                fill="#ffffff"
                stroke={color}
                strokeWidth={1}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo =
    fileToDataUri("/layouts/fundo-layout.jpg") || fileToDataUri("/fundo-layout.jpg");
  const { frente } = resolveImagePair(dados, paciente.sexo);
  const muscleMassKg =
    dados.massaMuscularEsqueleticaKg ??
    (hasPositive(dados.imme)
      ? Number(dados.imme) * (Number(paciente.altura_cm) / 100) ** 2
      : Number(dados.massaMagraKg) * 0.45);
  const circRows = measurementRows(
    CIRC_ORDER,
    CIRC_LABELS,
    dados.currentCircunferencias,
    dados.previousCircunferencias,
    false
  );
  const dobraRows = measurementRows(
    DOBRAS_ORDER,
    DOBRAS_LABELS,
    dados.currentDobras,
    dados.previousDobras,
    false
  );
  const chartSeries = buildChartSeries(dados, muscleMassKg, paciente.altura_cm);
  const showEvolutionCharts = Boolean(dados.compareResults && chartSeries.length > 1);
  const currentWeight = Number(dados.evolucaoAtual?.peso ?? dados.pesoKg);
  const currentMuscle = Number(dados.evolucaoAtual?.massaMuscular ?? muscleMassKg);
  const currentFat = Number(dados.evolucaoAtual?.bfPct ?? dados.bfPct);
  const previous = dados.previousSummary;
  const previousMuscle = skeletalMuscleFromSummary(previous, paciente.altura_cm);
  const comparisonPoints = [
    ...chartSeries.map((point) => ({
      label: point.label,
      weight: point.weight,
      muscle: point.muscle,
      fat: point.fat,
    })),
  ];
  const deltaWeight = previous?.pesoKg != null ? currentWeight - Number(previous.pesoKg) : null;
  const deltaMuscle =
    previousMuscle != null ? currentMuscle - Number(previousMuscle) : null;
  const deltaFat = previous?.bodyFatPct != null ? currentFat - Number(previous.bodyFatPct) : null;
  const fullNutriText = nutricionista?.nome
    ? `Nutricionista: ${nutricionista.nome.trim()}`
    : "Nutricionista:";
  const crnText = nutricionista?.crn ? `CRN: ${nutricionista.crn}` : "CRN:";
  const signatureWidth = Math.min(
    Math.max(fullNutriText.length * 5.8, crnText.length * 5.2),
    CONTENT_WIDTH - 70
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {fundo ? <Image src={fundo} style={styles.background} fixed /> : null}

        <View style={styles.header} fixed>
          {logo ? <Image src={logo} style={styles.logo} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.patientName}>{paciente.nome}</Text>
            <Text style={styles.patientMeta}>
              nascimento: {formatBirth(paciente.nascimento)} | peso: {toFixedPt(dados.pesoKg)} kg
            </Text>
            <Text style={styles.patientMeta}>
              altura: {toFixedPt(paciente.altura_cm, 0)} cm | sexo: {labelSexo(paciente.sexo)} |
              avaliação realizada:{" "}
              {formatAssessmentDate(dados.dataAvaliacaoAtual || dados.data)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRule} />
        <Text style={styles.title}>AVALIAÇÃO FÍSICA</Text>

        <View style={[styles.card, styles.compositionCard]}>
          <Text style={styles.cardTitle}>COMPOSIÇÃO CORPORAL</Text>
          <View style={styles.compositionHead}>
            <Text style={[styles.compositionHeadText, { width: "42%" }]}>Parâmetro</Text>
            <Text style={[styles.compositionHeadText, { width: "21%" }]}>Referência</Text>
            <Text style={[styles.compositionHeadText, { width: "20%" }]}>Resultado</Text>
            <Text style={[styles.compositionHeadText, { width: "17%" }]}>Avaliação</Text>
          </View>
          <CompositionRow label="Peso" reference="" result={`${toFixedPt(dados.pesoKg)} kg`} />
          <CompositionRow
            label="% de água corporal"
            reference={dados.classificacaoAgua?.referencia}
            result={hasPositive(dados.pctAgua) ? `${toFixedPt(dados.pctAgua)}%` : "—"}
            classification={dados.classificacaoAgua}
          />
          <CompositionRow
            label="Massa muscular (estimada)"
            reference={dados.classificacaoMassaMuscular?.referencia}
            result={`${toFixedPt(muscleMassKg)} kg`}
            classification={dados.classificacaoMassaMuscular}
          />
          <CompositionRow
            label="Massa livre de gordura"
            reference={dados.classificacaoMassaLivre?.referencia}
            result={`${toFixedPt(dados.massaMagraKg)} kg`}
            classification={dados.classificacaoMassaLivre}
          />
          <CompositionRow
            label="Massa adiposa"
            reference={dados.classificacaoMassaAdiposa?.referencia}
            result={`${toFixedPt(dados.massaGordaKg)} kg`}
            classification={dados.classificacaoMassaAdiposa}
          />
          <CompositionRow
            label="Índice de massa gorda"
            reference={dados.classificacaoImg?.referencia}
            result={`${toFixedPt(dados.img, 2)} kg/m²`}
            classification={dados.classificacaoImg}
          />
          <CompositionRow
            label="% de gordura"
            reference={dados.classificacaoGordura?.referencia}
            result={`${toFixedPt(dados.bfPct)}%`}
            classification={dados.classificacaoGordura}
          />
        </View>

        <View style={[styles.card, styles.bodyCard]}>
          <Text style={[styles.cardTitle, styles.bodyTitle]}>BIOTIPO CORPORAL</Text>
          {frente ? <Image src={frente} style={styles.bodyImage} /> : null}
        </View>

        <View style={[styles.card, styles.middleCard, styles.circumferenceCard]}>
          <MeasurementCard title="CIRCUNFERÊNCIAS (cm)" rows={circRows} />
        </View>
        <View style={[styles.card, styles.middleCard, styles.foldsCard]}>
          <MeasurementCard title="DOBRAS CUTÂNEAS (mm)" rows={dobraRows} />
        </View>
        <View style={[styles.card, styles.middleCard, styles.evolutionCard]}>
          <Text style={styles.cardTitle}>EVOLUÇÃO</Text>
          {showEvolutionCharts ? (
            <>
              <EvolutionTrend
                title="Peso (kg)"
                color="#73956a"
                values={chartSeries.map((point) => ({ label: point.label, value: point.weight }))}
              />
              <EvolutionTrend
                title="Massa muscular (kg)"
                color="#4a7dbd"
                values={chartSeries.map((point) => ({ label: point.label, value: point.muscle }))}
              />
              <EvolutionTrend
                title="% de gordura"
                color="#c62828"
                values={chartSeries.map((point) => ({ label: point.label, value: point.fat }))}
              />
            </>
          ) : (
            <EvolutionIntro />
          )}
        </View>

        <View style={[styles.card, styles.comparisonCard]}>
          <Text style={styles.cardTitle}>EVOLUÇÃO COMPARATIVA</Text>
          <View style={styles.comparisonRow}>
            <ComparisonBox
              label="Peso"
              value={currentWeight}
              unit="kg"
              delta={deltaWeight}
              points={comparisonPoints.map(({ label, weight }) => ({ label, value: weight }))}
              color="#262d26"
            />
            <ComparisonBox
              label="Massa muscular"
              value={currentMuscle}
              unit="kg"
              delta={deltaMuscle}
              points={comparisonPoints.map(({ label, muscle }) => ({ label, value: muscle }))}
              color="#4a7dbd"
            />
            <ComparisonBox
              label="% de gordura"
              value={currentFat}
              unit="%"
              delta={deltaFat}
              points={comparisonPoints.map(({ label, fat }) => ({ label, value: fat }))}
              color="#c62828"
            />
          </View>
        </View>

        <View style={styles.footerLayer} fixed>
          <Text style={styles.signature}>{fullNutriText}</Text>
          <View style={[styles.signatureRule, { width: signatureWidth }]} />
          <Text style={styles.crn}>{crnText}</Text>
          {logo ? <Image src={logo} style={styles.footerLogo} /> : null}
        </View>
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
