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
  braco: "Braço",
  coxa: "Coxa",
  abdomen: "Abdômen",
  peitoral: "Peitoral",
  axilar_media: "Axilar média",
  supra_espinhal: "Supra espinhal",
  panturrilha: "Panturrilha",
  biceps: "Bíceps",
  biceps_direito: "Bíceps direito",
  biceps_esquerdo: "Bíceps esquerdo",
  coxa_direita: "Coxa direita",
  coxa_esquerda: "Coxa esquerda",
  panturrilha_direita: "Panturrilha direita",
  panturrilha_esquerda: "Panturrilha esquerda",
};

const DOBRAS_LABELS: Record<string, string> = {
  peitoral: "Peitoral",
  axilar_media: "Axilar média",
  tricipital: "Tricipital",
  subescapular: "Subescapular",
  abdomen: "Abdominal",
  supra_iliaca: "Supra-ilíaca",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
  biceps: "Bíceps",
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
  "coxa_direita",
  "coxa_esquerda",
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

function toFixedPt(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
  return Number(value).toFixed(digits).replace(".", ",");
}

function diffText(current?: number | null, previous?: number | null, unit = "kg") {
  if (!Number.isFinite(Number(current)) || !Number.isFinite(Number(previous))) return null;
  const delta = Number(current) - Number(previous);
  if (Math.abs(delta) < 0.05) return null;
  const value = `${Math.abs(delta).toFixed(1).replace(".", ",")} ${unit}`;
  return delta < 0 ? { kind: "reduziu", value } : { kind: "ganhou", value };
}

function buildEvolutionSummary(current: PdfProps["dados"], previous?: SummarySnapshot | null) {
  if (!previous) return "faça uma reavaliação para ver sua evolução";

  const changes = [
    { label: "de peso corporal", data: diffText(current.pesoKg, previous.pesoKg, "kg") },
    { label: "de gordura corporal", data: diffText(current.bfPct, previous.bodyFatPct, "%") },
    { label: "de massa muscular", data: diffText(current.massaMagraKg, previous.massaMuscularKg, "kg") },
  ].filter((item) => item.data);

  if (changes.length === 0) return "";

  const reductions = changes
    .filter((item) => item.data?.kind === "reduziu")
    .map((item) => `você reduziu ${item.data?.value} ${item.label}`);

  const gains = changes
    .filter((item) => item.data?.kind === "ganhou")
    .map((item) => `você ganhou ${item.data?.value} ${item.label}`);

  return [...reductions, ...gains].join(" e ");
}

function labelSexo(sexo: "M" | "F") {
  return sexo === "F" ? "feminino" : "masculino";
}

function classifyVo2max(v?: number | null) {
  if (!Number.isFinite(Number(v))) return null;
  const value = Number(v);
  if (value < 35) return "Iniciante";
  if (value < 45) return "Recreativo treinado";
  if (value < 55) return "Muito bom";
  if (value < 65) return "Excelente";
  return "Elite";
}

function colorForClassificacao(cls?: Classificacao) {
  return cls?.cor === "amarelo" ? "#b45309" : "#166534";
}

function bgForClassificacao(cls?: Classificacao) {
  return cls?.cor === "amarelo" ? "#fff7ed" : "#ecfdf5";
}

function absPublic(relPath?: string) {
  if (!relPath) return null;
  const clean = relPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", clean);
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

function formatBirth(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}

function getMeasurementRows(
  order: readonly string[],
  labels: Record<string, string>,
  current?: MeasurementMap,
  previous?: MeasurementMap,
  compare = false
) {
  return order.map((key) => ({
    key,
    label: labels[key] || key,
    atual: current?.[key],
    anterior: compare ? previous?.[key] : undefined,
  }));
}

function buildChartSeries(currentWeight: number, currentFat: number, previous?: SummarySnapshot | null) {
  if (!(previous && Number(previous.pesoKg) > 0 && Number(previous.bodyFatPct) >= 0)) return [] as Array<{ label: string; weight: number; fat: number }>;
  return [
    {
      label: previous.createdAt ? new Date(previous.createdAt).toLocaleDateString("pt-BR") : "Antes",
      weight: Number(previous.pesoKg),
      fat: Number(previous.bodyFatPct),
    },
    { label: "Atual", weight: currentWeight, fat: currentFat },
  ];
}

function toPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function renderEvolutionChart(currentWeight: number, currentFat: number, previous?: SummarySnapshot | null) {
  const raw = buildChartSeries(currentWeight, currentFat, previous);
  const width = 248;
  const height = 126;
  const left = 24;
  const top = 14;
  const chartWidth = 196;
  const chartHeight = 74;

  if (raw.length === 0) {
    return (
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={12} ry={12} fill="#f8fafc" />
        <Line x1={left} y1={top + chartHeight} x2={left + chartWidth} y2={top + chartHeight} stroke="#cbd5e1" strokeWidth={1} />
        <Line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#cbd5e1" strokeWidth={1} />
        <Text style={{ position: "absolute", left: 68, top: 44, fontSize: 10, color: "#94a3b8" }}>
          Sem dados anteriores para comparação
        </Text>
      </Svg>
    );
  }

  const allWeights = raw.map((item) => item.weight);
  const allFat = raw.map((item) => item.fat);
  const minWeight = Math.min(...allWeights) - 2;
  const maxWeight = Math.max(...allWeights) + 2;
  const minFat = Math.max(0, Math.min(...allFat) - 3);
  const maxFat = Math.max(...allFat) + 3;

  const weightPoints = raw.map((item, index) => ({
    x: left + (raw.length === 1 ? chartWidth / 2 : (index * chartWidth) / (raw.length - 1)),
    y: top + chartHeight - ((item.weight - minWeight) / Math.max(1, maxWeight - minWeight)) * chartHeight,
    label: item.label,
    value: item.weight,
  }));
  const fatPoints = raw.map((item, index) => ({
    x: left + (raw.length === 1 ? chartWidth / 2 : (index * chartWidth) / (raw.length - 1)),
    y: top + chartHeight - ((item.fat - minFat) / Math.max(1, maxFat - minFat)) * chartHeight,
    label: item.label,
    value: item.fat,
  }));

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} rx={12} ry={12} fill="#f8fafc" />
      <Line x1={left} y1={top + chartHeight} x2={left + chartWidth} y2={top + chartHeight} stroke="#cbd5e1" strokeWidth={1} />
      <Line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#cbd5e1" strokeWidth={1} />
      <Polyline points={toPolyline(weightPoints)} stroke="#163c2f" strokeWidth={2} fill="none" />
      <Polyline points={toPolyline(fatPoints)} stroke="#84a94a" strokeWidth={2} fill="none" />
      {weightPoints.map((point, index) => (
        <React.Fragment key={`w-${index}`}>
          <Circle cx={point.x} cy={point.y} r={3.1} fill="#163c2f" />
          <Text style={{ position: "absolute", left: point.x - 12, top: point.y - 14, fontSize: 7.5, color: "#163c2f" }}>
            {toFixedPt(point.value)}
          </Text>
          <Text style={{ position: "absolute", left: point.x - 24, top: top + chartHeight + 6, fontSize: 7.5, color: "#64748b" }}>
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
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
    fontSize: 9,
    color: "#24311f",
    backgroundColor: "#fcfcf8",
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
    gap: 12,
    marginBottom: 6,
  },
  logo: {
    width: 54,
    height: 54,
    objectFit: "contain",
  },
  headerText: {
    flexGrow: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 3,
  },
  patientMeta: {
    fontSize: 9,
    color: "#3f4d38",
    marginBottom: 2,
  },
  divider: {
    height: 1.7,
    backgroundColor: "#37542a",
    marginTop: 4,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    color: "#111111",
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    width: "48.7%",
    borderWidth: 1,
    borderColor: "#5a6f50",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 10,
    minHeight: 240,
  },
  topCard: {
    minHeight: 258,
  },
  bottomCard: {
    minHeight: 228,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#355227",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  splitRow: {
    flexDirection: "row",
    gap: 8,
  },
  leftCol: {
    width: "61%",
    gap: 3,
  },
  rightCol: {
    width: "39%",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyFrameFront: {
    width: 118,
    height: 182,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  bodyFrameSide: {
    width: 110,
    height: 186,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  bodyImageFront: {
    width: 154,
    height: 222,
    objectFit: "cover",
  },
  bodyImageSide: {
    width: 138,
    height: 220,
    objectFit: "cover",
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1e7",
    paddingVertical: 3,
    gap: 6,
  },
  kvLabel: {
    color: "#263424",
    fontSize: 8.6,
    width: "52%",
  },
  kvValue: {
    color: "#1f2937",
    fontSize: 8.6,
    fontWeight: 700,
    textAlign: "right",
    width: "28%",
  },
  kvStatus: {
    width: "20%",
    textAlign: "right",
    fontSize: 7.4,
    fontWeight: 700,
  },
  metricsWrap: {
    marginTop: 7,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  metricBoxMuscle: {
    width: "48.5%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    minHeight: 56,
  },
  metricBoxFat: {
    width: "48.5%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    minHeight: 56,
  },
  metricTitleMuscle: {
    color: "#15803d",
    fontSize: 7.6,
    fontWeight: 700,
    marginBottom: 2,
  },
  metricTitleFat: {
    color: "#c2410c",
    fontSize: 7.6,
    fontWeight: 700,
    marginBottom: 2,
  },
  metricValue: {
    color: "#111827",
    fontSize: 10.4,
    fontWeight: 800,
  },
  metricStatus: {
    fontSize: 7.2,
    marginTop: 2,
    fontWeight: 700,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDotWeight: {
    width: 10,
    height: 4,
    backgroundColor: "#163c2f",
    borderRadius: 99,
  },
  legendDotFat: {
    width: 10,
    height: 4,
    backgroundColor: "#84a94a",
    borderRadius: 99,
  },
  legendText: {
    fontSize: 7.6,
    color: "#475569",
  },
  compareInfo: {
    marginTop: 6,
    fontSize: 7.8,
    color: "#475569",
    minHeight: 28,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe5d0",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1e7",
    paddingVertical: 3,
    gap: 4,
    minHeight: 16,
  },
  colLabel: {
    width: "46%",
    fontSize: 7.7,
    color: "#263424",
  },
  colPrev: {
    width: "24%",
    fontSize: 7.7,
    color: "#475569",
    textAlign: "center",
  },
  colCurrent: {
    width: "24%",
    fontSize: 7.7,
    color: "#111827",
    textAlign: "center",
    fontWeight: 700,
  },
  tableBodyWrap: {
    flexGrow: 1,
  },
  footer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signature: {
    fontSize: 14,
    color: "#304b28",
    marginBottom: 2,
  },
  crn: {
    fontSize: 9,
    color: "#304b28",
  },
  smallLogo: {
    width: 46,
    height: 46,
    objectFit: "contain",
  },
});

function ComparisonTable({
  title,
  rows,
  compare,
}: {
  title: string;
  rows: Array<{ key: string; label: string; atual?: number | null | undefined; anterior?: number | null | undefined }>;
  compare: boolean;
}) {
  const labelStyle = compare ? styles.colLabel : { ...styles.colLabel, width: "64%" };
  const currentStyle = compare ? styles.colCurrent : { ...styles.colCurrent, width: "30%" };

  return (
    <View style={{ ...styles.card, ...styles.bottomCard }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.tableBodyWrap}>
        <View style={styles.tableHeader}>
          <Text style={labelStyle}>Parâmetro</Text>
          {compare ? <Text style={styles.colPrev}>Antes</Text> : null}
          <Text style={currentStyle}>Atual</Text>
        </View>
        {rows.map((row) => (
          <View style={styles.tableRow} key={row.key}>
            <Text style={labelStyle}>{row.label}</Text>
            {compare ? <Text style={styles.colPrev}>{toFixedPt(row.anterior)}</Text> : null}
            <Text style={currentStyle}>{toFixedPt(row.atual)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function statusText(cls?: Classificacao) {
  return cls?.label || "Resultado";
}

function statusColor(cls?: Classificacao) {
  return cls?.cor === "amarelo" ? "#b45309" : "#166534";
}

export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/fundo-layout.jpg") || fileToDataUri("/layouts/fundo-layout.jpg");
  const { frente, lateral } = resolveImagePair(dados, paciente.sexo);
  const nomeNutri = nutricionista?.nome || "Nutricionista";
  const crn = nutricionista?.crn || "—";
  const compare = Boolean(dados.compareResults && dados.previousSummary);
  const circRows = getMeasurementRows(CIRC_ORDER, CIRC_LABELS, dados.currentCircunferencias, dados.previousCircunferencias, compare);
  const dobraRows = getMeasurementRows(DOBRAS_ORDER, DOBRAS_LABELS, dados.currentDobras, dados.previousDobras, compare);
  const evolutionSummary = buildEvolutionSummary(dados, compare ? dados.previousSummary : null);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        {fundo ? <Image src={fundo} style={styles.bg} /> : null}

        <View style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <View style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.patientName}>{paciente.nome}</Text>
            <Text style={styles.patientMeta}>
              nascimento: {formatBirth(paciente.nascimento)} | peso: {toFixedPt(dados.pesoKg)}kg
            </Text>
            <Text style={styles.patientMeta}>
              altura {toFixedPt(paciente.altura_cm, 0)}cm | sexo: {labelSexo(paciente.sexo)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>AVALIAÇÃO FÍSICA</Text>
        </View>

        <View style={styles.grid}>
          <View style={{ ...styles.card, ...styles.topCard }}>
            <Text style={styles.cardTitle}>Composição corporal</Text>
            <View style={styles.splitRow}>
              <View style={styles.leftCol}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Peso Atual</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.pesoKg)} kg</Text>
                  <Text style={{ ...styles.kvStatus, color: "#64748b" }}>—</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>% de Água</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.pctAgua)}%</Text>
                  <Text style={{ ...styles.kvStatus, color: colorForClassificacao(dados.classificacaoAgua) }}>
                    {statusText(dados.classificacaoAgua)}
                  </Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Massa Magra</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.massaMagraKg)} kg</Text>
                  <Text style={{ ...styles.kvStatus, color: "#64748b" }}>—</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Massa Gorda</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.massaGordaKg)} kg</Text>
                  <Text style={{ ...styles.kvStatus, color: "#64748b" }}>—</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>% de Gordura Corporal</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.bfPct)}%</Text>
                  <Text style={{ ...styles.kvStatus, color: colorForClassificacao(dados.classificacaoGordura) }}>
                    {statusText(dados.classificacaoGordura)}
                  </Text>
                </View>

                <View style={styles.metricsWrap}>
                  <View style={styles.metricBoxFat}>
                    <Text style={styles.metricTitleFat}>Índice de Massa Gorda</Text>
                    <Text style={styles.metricValue}>{toFixedPt(dados.img, 2)} kg/m²</Text>
                    <Text style={{ ...styles.metricStatus, color: statusColor(dados.classificacaoImg) }}>{statusText(dados.classificacaoImg)}</Text>
                  </View>
                  <View style={styles.metricBoxMuscle}>
                    <Text style={styles.metricTitleMuscle}>Músculo Esquelético</Text>
                    <Text style={styles.metricValue}>{toFixedPt(dados.imme, 2)} kg/m²</Text>
                    <Text style={{ ...styles.metricStatus, color: statusColor(dados.classificacaoImme) }}>{statusText(dados.classificacaoImme)}</Text>
                  </View>
                  <View style={styles.metricBoxMuscle}>
                    <Text style={styles.metricTitleMuscle}>Massa Livre de Gordura</Text>
                    <Text style={styles.metricValue}>{toFixedPt(dados.ffmi, 2)} kg/m²</Text>
                    <Text style={{ ...styles.metricStatus, color: statusColor(dados.classificacaoFfmi) }}>{statusText(dados.classificacaoFfmi)}</Text>
                  </View>
                  <View style={styles.metricBoxFat}>
                    <Text style={styles.metricTitleFat}>VO2max — (corredores)</Text>
                    <Text style={styles.metricValue}>
                      {dados.vo2max !== null && dados.vo2max !== undefined ? `${toFixedPt(dados.vo2max)} ml/kg/min` : "-"}
                    </Text>
                    <Text style={{ ...styles.metricStatus, color: "#64748b" }}>{classifyVo2max(dados.vo2max) || "-"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rightCol}>
                <View style={styles.bodyFrameFront}>{frente ? <Image src={frente} style={styles.bodyImageFront} /> : null}</View>
              </View>
            </View>
          </View>

          <View style={{ ...styles.card, ...styles.topCard }}>
            <Text style={styles.cardTitle}>Evolução</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendDotWeight} />
                <Text style={styles.legendText}>Peso (kg)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendDotFat} />
                <Text style={styles.legendText}>% Gordura</Text>
              </View>
            </View>
            {renderEvolutionChart(dados.pesoKg, dados.bfPct, compare ? dados.previousSummary : null)}
            <Text style={styles.compareInfo}>{evolutionSummary}</Text>
          </View>

          <ComparisonTable title="Circunferências" rows={circRows} compare={compare} />

          <View style={{ ...styles.card, ...styles.bottomCard }}>
            <Text style={styles.cardTitle}>Dobras</Text>
            <View style={styles.splitRow}>
              <View style={{ ...styles.leftCol, width: compare ? "59%" : "57%" }}>
                <View style={styles.tableBodyWrap}>
                  <View style={styles.tableHeader}>
                    <Text style={compare ? styles.colLabel : { ...styles.colLabel, width: "64%" }}>Parâmetro</Text>
                    {compare ? <Text style={styles.colPrev}>Antes</Text> : null}
                    <Text style={compare ? styles.colCurrent : { ...styles.colCurrent, width: "30%" }}>Atual</Text>
                  </View>
                  {dobraRows.map((row) => (
                    <View style={styles.tableRow} key={row.key}>
                      <Text style={compare ? styles.colLabel : { ...styles.colLabel, width: "64%" }}>{row.label}</Text>
                      {compare ? <Text style={styles.colPrev}>{toFixedPt(row.anterior)}</Text> : null}
                      <Text style={compare ? styles.colCurrent : { ...styles.colCurrent, width: "30%" }}>{toFixedPt(row.atual)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.rightCol}>
                <View style={styles.bodyFrameSide}>{lateral ? <Image src={lateral} style={styles.bodyImageSide} /> : null}</View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.signature}>Nutricionista: {nomeNutri}</Text>
            <Text style={styles.crn}>CRN: {crn}</Text>
          </View>
          {logo ? <Image src={logo} style={styles.smallLogo} /> : <View style={styles.smallLogo} />}
        </View>
      </Page>
    </Document>
  );
}

export default AvaliacaoPdfDocument;
