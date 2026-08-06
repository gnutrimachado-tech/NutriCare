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
  "axilar_media",
  "supra_espinhal",
  "biceps",
  "biceps_direito",
  "biceps_esquerdo",
  "coxa",
  "coxa_direita",
  "coxa_esquerda",
  "panturrilha",
  "panturrilha_direita",
  "panturrilha_esquerda",
] as const;

const DOBRAS_ORDER = [
  "tricipital",
  "subescapular",
  "axilar_media",
  "supra_iliaca",
  "abdomen",
  "coxa",
  "panturrilha",
  "biceps",
  "peitoral",
  "supra_espinhal",
  "coxa_proximal",
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
  compare = false,
  unit = "cm"
) {
  const base = order.map((key) => {
    const atual = current?.[key];
    const anterior = previous?.[key];
    return {
      key,
      label: labels[key] || key,
      anterior,
      atual,
      anteriorTxt: hasPositive(anterior) ? `${toFixedPt(anterior)} ${unit}` : "-",
      atualTxt: hasPositive(atual) ? `${toFixedPt(atual)} ${unit}` : "-",
    };
  });

  return compare
    ? base.filter((row) => hasPositive(row.anterior) || hasPositive(row.atual))
    : base;
}

function metricDeltaSentence(dados: PdfProps["dados"], compare: boolean) {
  if (!compare || !dados.previousSummary) return null;

  const reduced: string[] = [];
  const gained: string[] = [];
  const prev = dados.previousSummary;

  const addDelta = (diff: number, reducedText: string, gainedText: string) => {
    if (Math.abs(diff) < 0.05) return;
    (diff < 0 ? reduced : gained).push(diff < 0 ? reducedText : gainedText);
  };

  const diffPeso = Number(dados.pesoKg) - Number(prev.pesoKg ?? dados.pesoKg);
  const diffGordura = Number(dados.bfPct) - Number(prev.bodyFatPct ?? dados.bfPct);
  const diffMusculo = Number(dados.massaMagraKg) - Number(prev.massaMuscularKg ?? dados.massaMagraKg);

  addDelta(diffPeso, `Você reduziu ${toFixedPt(Math.abs(diffPeso))} kg de peso corporal.`, `Você ganhou ${toFixedPt(Math.abs(diffPeso))} kg de peso corporal.`);
  addDelta(diffGordura, `Você reduziu ${toFixedPt(Math.abs(diffGordura))}% de gordura corporal.`, `Você ganhou ${toFixedPt(Math.abs(diffGordura))}% de gordura corporal.`);
  addDelta(diffMusculo, `Você reduziu ${toFixedPt(Math.abs(diffMusculo))} kg de massa muscular.`, `Você ganhou ${toFixedPt(Math.abs(diffMusculo))} kg de massa muscular.`);

  const lines = [reduced.length ? reduced.join(" ") : null, gained.length ? gained.join(" ") : null]
    .filter((line): line is string => Boolean(line));
  return lines.length ? lines : null;
}

function buildChartSeries(currentWeight: number, currentFat: number, previous?: SummarySnapshot | null) {
  if (!previous || !hasPositive(previous.pesoKg) || previous.bodyFatPct === null || previous.bodyFatPct === undefined) {
    return null;
  }
  return [
    {
      label: previous.createdAt ? new Date(previous.createdAt).toLocaleDateString("pt-BR") : "Antes",
      weight: Number(previous.pesoKg),
      fat: Number(previous.bodyFatPct),
    },
    {
      label: "Atual",
      weight: Number(currentWeight),
      fat: Number(currentFat),
    },
  ];
}

function chartContent(currentWeight: number, currentFat: number, previous?: SummarySnapshot | null) {
  const series = buildChartSeries(currentWeight, currentFat, previous);
  const width = 250;
  const height = 128;
  const left = 22;
  const top = 14;
  const chartWidth = 205;
  const chartHeight = 82;

  if (!series) {
    return (
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={10} ry={10} fill="#f8fafc" />
        <Line x1={left} y1={top + chartHeight} x2={left + chartWidth} y2={top + chartHeight} stroke="#d9dfd2" strokeWidth={1} />
        <Line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#d9dfd2" strokeWidth={1} />
        <Line x1={left} y1={top + 20} x2={left + chartWidth} y2={top + 20} stroke="#eef2ea" strokeWidth={1} />
        <Line x1={left} y1={top + 41} x2={left + chartWidth} y2={top + 41} stroke="#eef2ea" strokeWidth={1} />
        <Line x1={left} y1={top + 61} x2={left + chartWidth} y2={top + 61} stroke="#eef2ea" strokeWidth={1} />
      </Svg>
    );
  }

  const allWeights = series.map((item) => item.weight);
  const allFat = series.map((item) => item.fat);
  const minWeight = Math.min(...allWeights) - 2;
  const maxWeight = Math.max(...allWeights) + 2;
  const minFat = Math.max(0, Math.min(...allFat) - 3);
  const maxFat = Math.max(...allFat) + 3;

  const weightPoints = series.map((item, index) => ({
    x: left + (index * chartWidth) / Math.max(1, series.length - 1),
    y: top + chartHeight - ((item.weight - minWeight) / Math.max(1, maxWeight - minWeight)) * chartHeight,
    label: item.label,
    value: item.weight,
  }));

  const fatPoints = series.map((item, index) => ({
    x: left + (index * chartWidth) / Math.max(1, series.length - 1),
    y: top + chartHeight - ((item.fat - minFat) / Math.max(1, maxFat - minFat)) * chartHeight,
    label: item.label,
    value: item.fat,
  }));

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} rx={10} ry={10} fill="#f8fafc" />
      <Line x1={left} y1={top + chartHeight} x2={left + chartWidth} y2={top + chartHeight} stroke="#d9dfd2" strokeWidth={1} />
      <Line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#d9dfd2" strokeWidth={1} />
      <Line x1={left} y1={top + 20} x2={left + chartWidth} y2={top + 20} stroke="#eef2ea" strokeWidth={1} />
      <Line x1={left} y1={top + 41} x2={left + chartWidth} y2={top + 41} stroke="#eef2ea" strokeWidth={1} />
      <Line x1={left} y1={top + 61} x2={left + chartWidth} y2={top + 61} stroke="#eef2ea" strokeWidth={1} />
      <Polyline points={weightPoints.map((p) => `${p.x},${p.y}`).join(" ")} stroke="#163c2f" strokeWidth={2} fill="none" />
      <Polyline points={fatPoints.map((p) => `${p.x},${p.y}`).join(" ")} stroke="#84a94a" strokeWidth={2} fill="none" />
      {weightPoints.map((point, index) => (
        <React.Fragment key={`w-${index}`}>
          <Circle cx={point.x} cy={point.y} r={3.1} fill="#163c2f" />
          <Text style={{ position: "absolute", left: point.x - 10, top: point.y - 13, fontSize: 7.5, color: "#163c2f" }}>
            {toFixedPt(point.value)}
          </Text>
          <Text style={{ position: "absolute", left: point.x - 16, top: top + chartHeight + 8, fontSize: 7.2, color: "#6b7280" }}>
            {point.label}
          </Text>
        </React.Fragment>
      ))}
      {fatPoints.map((point, index) => (
        <React.Fragment key={`f-${index}`}>
          <Circle cx={point.x} cy={point.y} r={3.1} fill="#84a94a" />
          <Text style={{ position: "absolute", left: point.x - 12, top: point.y + 5, fontSize: 7.5, color: "#84a94a" }}>
            {toFixedPt(point.value)}%
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    fontSize: 9,
    color: "#232c22",
    backgroundColor: "#fbfaf6",
  },
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 4,
  },
  logo: {
    width: 34,
    height: 34,
    objectFit: "contain",
  },
  headerText: {
    flexGrow: 1,
  },
  patientName: {
    fontSize: 10.6,
    fontWeight: 700,
    marginBottom: 2,
  },
  patientMeta: {
    fontSize: 7.7,
    color: "#4b5848",
    marginBottom: 1,
  },
  divider: {
    height: 1.2,
    backgroundColor: "#3d5b33",
    marginBottom: 8,
  },
  title: {
    fontSize: 16.5,
    fontWeight: 800,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  card: {
    width: "48.7%",
    borderWidth: 1,
    borderColor: "#596c50",
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 9,
  },
  topCard: {
    minHeight: 285,
  },
  bottomCard: {
    minHeight: 225,
  },
  cardTitle: {
    fontSize: 10.2,
    fontWeight: 700,
    color: "#2f3f28",
    textTransform: "uppercase",
    marginBottom: 7,
  },
  compositionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  compositionLeft: {
    width: "48%",
    paddingRight: 6,
  },
  compositionRight: {
    width: "52%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  metricLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 2,
    gap: 8,
  },
  metricLabel: {
    width: "50%",
    fontSize: 8,
    color: "#293525",
  },
  metricValue: {
    width: "26%",
    fontSize: 8,
    textAlign: "right",
    color: "#111827",
    fontWeight: 700,
  },
  metricStatus: {
    width: "24%",
    fontSize: 7.6,
    textAlign: "right",
    color: "#64748b",
  },
  miniCardsWrap: {
    marginTop: 8,
    width: 92,
    gap: 6,
  },
  miniCardOrange: {
    borderWidth: 1,
    borderColor: "#f5c78a",
    backgroundColor: "#fff7ed",
    borderRadius: 9,
    padding: 6,
    minHeight: 44,
  },
  miniCardGreen: {
    borderWidth: 1,
    borderColor: "#bfe7c9",
    backgroundColor: "#ecfdf5",
    borderRadius: 9,
    padding: 6,
    minHeight: 44,
  },
  miniCardTitleOrange: {
    fontSize: 6.6,
    color: "#c2410c",
    fontWeight: 700,
    marginBottom: 2,
  },
  miniCardTitleGreen: {
    fontSize: 6.6,
    color: "#15803d",
    fontWeight: 700,
    marginBottom: 2,
  },
  miniCardValue: {
    fontSize: 10.6,
    color: "#111827",
    fontWeight: 800,
    marginBottom: 1,
  },
  miniCardStatus: {
    fontSize: 6.8,
    color: "#6b7280",
  },
  bodyFront: {
    width: 128,
    height: 205,
    objectFit: "contain",
  },
  bodySide: {
    width: 96,
    height: 192,
    objectFit: "contain",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendWeight: {
    width: 10,
    height: 3,
    borderRadius: 99,
    backgroundColor: "#163c2f",
  },
  legendFat: {
    width: 10,
    height: 3,
    borderRadius: 99,
    backgroundColor: "#84a94a",
  },
  legendText: {
    fontSize: 7.3,
    color: "#5d6a58",
  },
  evolutionMsgWrap: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: "#dc2626",
    marginTop: 2,
    flexShrink: 0,
  },
  evolutionMsg: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.35,
    flexGrow: 1,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dce4d3",
    paddingBottom: 5,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1e7",
    paddingVertical: 2.8,
  },
  colLabel: {
    width: "48%",
    fontSize: 7.7,
    color: "#2b3627",
  },
  colPrev: {
    width: "22%",
    fontSize: 7.7,
    color: "#64748b",
    textAlign: "center",
  },
  colCurrent: {
    width: "22%",
    fontSize: 7.7,
    color: "#111827",
    textAlign: "center",
    fontWeight: 700,
  },
  tableNote: {
    marginTop: 8,
    fontSize: 7.4,
    color: "#6b7280",
  },
  dobrasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dobrasTableCol: {
    width: "63%",
  },
  dobrasImageCol: {
    width: "33%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureTitle: {
    fontSize: 12.2,
    color: "#2f4727",
    fontFamily: "GreatVibes",
    marginBottom: 1,
  },
  crn: {
    fontSize: 8.2,
    color: "#2f4727",
  },
  footerLogo: {
    width: 34,
    height: 34,
    objectFit: "contain",
  },
});

function ComparisonTable({
  title,
  rows,
  compare,
}: {
  title: string;
  rows: Array<{ key: string; label: string; anteriorTxt: string; atualTxt: string }>;
  compare: boolean;
}) {
  return (
    <View style={[styles.card, styles.bottomCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.colLabel}>Parâmetro</Text>
        {compare ? <Text style={styles.colPrev}>Antes</Text> : null}
        <Text style={styles.colCurrent}>Atual</Text>
      </View>
      {rows.map((row) => (
        <View style={styles.tableRow} key={row.key}>
          <Text style={styles.colLabel}>{row.label}</Text>
          {compare ? <Text style={styles.colPrev}>{row.anteriorTxt}</Text> : null}
          <Text style={styles.colCurrent}>{row.atualTxt}</Text>
        </View>
      ))}
    </View>
  );
}

export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/fundo-layout.jpg") || fileToDataUri("/layouts/fundo-layout.jpg");
  const { frente, lateral } = resolveImagePair(dados, paciente.sexo);
  const compare = Boolean(dados.compareResults && dados.previousSummary);
  const circRows = measurementRows(CIRC_ORDER, CIRC_LABELS, dados.currentCircunferencias, dados.previousCircunferencias, compare, "cm");
  const dobraRows = measurementRows(DOBRAS_ORDER, DOBRAS_LABELS, dados.currentDobras, dados.previousDobras, compare, "mm");
  const evolutionText = metricDeltaSentence(dados, compare);
  const firstEvolutionMsg = "Faça uma reavaliação para ver sua evolução.";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {fundo ? <Image src={fundo} style={styles.bg} /> : null}

        <View style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <View style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.patientName}>{paciente.nome}</Text>
            <Text style={styles.patientMeta}>nascimento: {formatBirth(paciente.nascimento)} | peso: {toFixedPt(dados.pesoKg)}kg</Text>
            <Text style={styles.patientMeta}>altura {toFixedPt(paciente.altura_cm, 0)}cm | sexo: {labelSexo(paciente.sexo)}</Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.title}>AVALIAÇÃO FÍSICA</Text>

        <View style={styles.row}>
          <View style={[styles.card, styles.topCard]}>
            <Text style={styles.cardTitle}>Composição corporal</Text>
            <View style={styles.compositionRow}>
              <View style={styles.compositionLeft}>
                <View style={styles.metricLine}>
                  <Text style={styles.metricLabel}>Peso Atual</Text>
                  <Text style={styles.metricValue}>{toFixedPt(dados.pesoKg)} kg</Text>
                  <Text style={styles.metricStatus}>-</Text>
                </View>
                <View style={styles.metricLine}>
                  <Text style={styles.metricLabel}>% de Água</Text>
                  <Text style={styles.metricValue}>{toFixedPt(dados.pctAgua)}%</Text>
                  <Text style={styles.metricStatus}>{dados.classificacaoAgua?.label || "-"}</Text>
                </View>
                <View style={styles.metricLine}>
                  <Text style={styles.metricLabel}>Massa Magra</Text>
                  <Text style={styles.metricValue}>{toFixedPt(dados.massaMagraKg)} kg</Text>
                  <Text style={styles.metricStatus}>-</Text>
                </View>
                <View style={styles.metricLine}>
                  <Text style={styles.metricLabel}>Massa Gorda</Text>
                  <Text style={styles.metricValue}>{toFixedPt(dados.massaGordaKg)} kg</Text>
                  <Text style={styles.metricStatus}>-</Text>
                </View>
                <View style={styles.metricLine}>
                  <Text style={styles.metricLabel}>% de Gordura Corporal</Text>
                  <Text style={styles.metricValue}>{toFixedPt(dados.bfPct)}%</Text>
                  <Text style={styles.metricStatus}>{dados.legendaImagem || "-"}</Text>
                </View>

                <View style={styles.miniCardsWrap}>
                  <View style={styles.miniCardOrange}>
                    <Text style={styles.miniCardTitleOrange}>Índice de Massa Gorda</Text>
                    <Text style={styles.miniCardValue}>{toFixedPt(dados.img, 2)} kg/m²</Text>
                    <Text style={styles.miniCardStatus}>{dados.classificacaoImg?.label || "Resultado"}</Text>
                  </View>
                  <View style={styles.miniCardGreen}>
                    <Text style={styles.miniCardTitleGreen}>Músculo Esquelético</Text>
                    <Text style={styles.miniCardValue}>{toFixedPt(dados.imme, 2)} kg/m²</Text>
                    <Text style={styles.miniCardStatus}>{dados.classificacaoImme?.label || "Resultado"}</Text>
                  </View>
                  <View style={styles.miniCardGreen}>
                    <Text style={styles.miniCardTitleGreen}>Massa Livre de Gordura</Text>
                    <Text style={styles.miniCardValue}>{toFixedPt(dados.ffmi, 2)} kg/m²</Text>
                    <Text style={styles.miniCardStatus}>Resultado</Text>
                  </View>
                  <View style={styles.miniCardOrange}>
                    <Text style={styles.miniCardTitleOrange}>VO2max — (corredores)</Text>
                    <Text style={styles.miniCardValue}>{dados.vo2max !== null && dados.vo2max !== undefined ? `${toFixedPt(dados.vo2max)} ml/kg/min` : "-"}</Text>
                    <Text style={styles.miniCardStatus}>{dados.vo2ClassLabel || "Resultado"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.compositionRight}>{frente ? <Image src={frente} style={styles.bodyFront} /> : null}</View>
            </View>
          </View>

          <View style={[styles.card, styles.topCard]}>
            <Text style={styles.cardTitle}>Evolução</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendWeight} />
                <Text style={styles.legendText}>Peso (kg)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendFat} />
                <Text style={styles.legendText}>% Gordura</Text>
              </View>
            </View>
            {chartContent(dados.pesoKg, dados.bfPct, compare ? dados.previousSummary : null)}
            {!compare ? (
              <View style={styles.evolutionMsgWrap}>
                <View style={styles.redDot} />
                <Text style={styles.evolutionMsg}>{firstEvolutionMsg}</Text>
              </View>
            ) : evolutionText ? (
              <View style={styles.evolutionMsgWrap}>
                <View style={styles.redDot} />
                <View style={styles.evolutionMsg}>
                  {evolutionText.map((line) => (
                    <Text key={line}>{line}</Text>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          <ComparisonTable title="Circunferências" rows={circRows} compare={compare} />

          <View style={[styles.card, styles.bottomCard]}>
            <Text style={styles.cardTitle}>Dobras</Text>
            <View style={styles.dobrasRow}>
              <View style={styles.dobrasTableCol}>
                <View style={styles.tableHeader}>
                  <Text style={styles.colLabel}>Parâmetro</Text>
                  {compare ? <Text style={styles.colPrev}>Antes</Text> : null}
                  <Text style={styles.colCurrent}>Atual</Text>
                </View>
                {dobraRows.map((row) => (
                  <View style={styles.tableRow} key={row.key}>
                    <Text style={styles.colLabel}>{row.label}</Text>
                    {compare ? <Text style={styles.colPrev}>{row.anteriorTxt}</Text> : null}
                    <Text style={styles.colCurrent}>{row.atualTxt}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.dobrasImageCol}>{lateral ? <Image src={lateral} style={styles.bodySide} /> : null}</View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.signatureTitle}>Nutricionista: {nutricionista?.nome || "Nutricionista"}</Text>
            <Text style={styles.crn}>CRN: {nutricionista?.crn || "-"}</Text>
          </View>
          {logo ? <Image src={logo} style={styles.footerLogo} /> : <View style={styles.footerLogo} />}
        </View>
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
