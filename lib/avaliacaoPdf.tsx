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

function toFixedPt(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(digits).replace(".", ",");
}

function labelSexo(sexo: "M" | "F") {
  return sexo === "F" ? "feminino" : "masculino";
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

function getMeasurementRows(order: readonly string[], labels: Record<string, string>, current?: MeasurementMap, previous?: MeasurementMap, compare = false) {
  const rows = order
    .map((key) => ({
      key,
      label: labels[key] || key,
      atual: current?.[key],
      anterior: previous?.[key],
    }))
    .filter((row) => {
      const atualOk = row.atual !== null && row.atual !== undefined && Number(row.atual) > 0;
      const anteriorOk = row.anterior !== null && row.anterior !== undefined && Number(row.anterior) > 0;
      return atualOk || (compare && anteriorOk);
    });
  return rows;
}

function buildChartSeries(currentWeight: number, currentFat: number, previous?: SummarySnapshot | null) {
  const points = [] as Array<{ label: string; weight: number; fat: number }>;
  if (previous && Number(previous.pesoKg) > 0 && Number(previous.bodyFatPct) >= 0) {
    points.push({
      label: previous.createdAt ? new Date(previous.createdAt).toLocaleDateString("pt-BR") : "Antes",
      weight: Number(previous.pesoKg),
      fat: Number(previous.bodyFatPct),
    });
  }
  points.push({ label: "Atual", weight: currentWeight, fat: currentFat });
  return points;
}

function toPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function renderEvolutionChart(currentWeight: number, currentFat: number, previous?: SummarySnapshot | null) {
  const raw = buildChartSeries(currentWeight, currentFat, previous);
  const width = 240;
  const height = 140;
  const left = 24;
  const top = 16;
  const chartWidth = 192;
  const chartHeight = 90;

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
          <Circle cx={point.x} cy={point.y} r={3.2} fill="#163c2f" />
          <Text
            style={{ position: "absolute", left: point.x - 12, top: point.y - 16, fontSize: 8, color: "#163c2f" }}
          >
            {toFixedPt(point.value)}
          </Text>
          <Text
            style={{ position: "absolute", left: point.x - 18, top: top + chartHeight + 6, fontSize: 8, color: "#64748b" }}
          >
            {point.label}
          </Text>
        </React.Fragment>
      ))}
      {fatPoints.map((point, index) => (
        <React.Fragment key={`f-${index}`}>
          <Circle cx={point.x} cy={point.y} r={3.2} fill="#84a94a" />
          <Text
            style={{ position: "absolute", left: point.x - 11, top: point.y + 5, fontSize: 8, color: "#84a94a" }}
          >
            {toFixedPt(point.value)}%
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 22,
    fontSize: 10,
    color: "#24311f",
    backgroundColor: "#fcfcf8",
  },
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.11,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  headerText: {
    flexGrow: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 3,
  },
  patientMeta: {
    fontSize: 10,
    color: "#3f4d38",
    marginBottom: 2,
  },
  divider: {
    height: 2,
    backgroundColor: "#37542a",
    marginTop: 6,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    color: "#111111",
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "#5a6f50",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
    minHeight: 254,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#355227",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  leftCol: {
    width: "60%",
    gap: 4,
  },
  rightCol: {
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyImageFront: {
    width: 126,
    height: 188,
    objectFit: "contain",
  },
  bodyImageSide: {
    width: 112,
    height: 196,
    objectFit: "contain",
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1e7",
    paddingVertical: 4,
    gap: 8,
  },
  kvLabel: {
    color: "#263424",
    fontSize: 9.2,
    width: "59%",
  },
  kvValue: {
    color: "#1f2937",
    fontSize: 9.2,
    fontWeight: 700,
    textAlign: "right",
    width: "41%",
  },
  badge: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 8.2,
    fontWeight: 700,
    alignSelf: "flex-start",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  metricPillMuscle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    minWidth: 110,
  },
  metricPillFat: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    minWidth: 110,
  },
  metricPillTitleMuscle: {
    color: "#15803d",
    fontSize: 8.2,
    fontWeight: 700,
    marginBottom: 3,
  },
  metricPillTitleFat: {
    color: "#c2410c",
    fontSize: 8.2,
    fontWeight: 700,
    marginBottom: 3,
  },
  metricPillValue: {
    color: "#111827",
    fontSize: 12,
    fontWeight: 800,
  },
  metricPillStatus: {
    fontSize: 8.1,
    marginTop: 2,
    color: "#64748b",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
    marginBottom: 6,
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
    fontSize: 8.4,
    color: "#475569",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe5d0",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1e7",
    paddingVertical: 4,
    gap: 6,
  },
  colLabel: {
    width: "44%",
    fontSize: 8.8,
    color: "#263424",
  },
  colPrev: {
    width: "24%",
    fontSize: 8.8,
    color: "#475569",
    textAlign: "center",
  },
  colCurrent: {
    width: "24%",
    fontSize: 8.8,
    color: "#111827",
    textAlign: "center",
    fontWeight: 700,
  },
  tableBodyWrap: {
    flexGrow: 1,
  },
  emptyTable: {
    marginTop: 18,
    textAlign: "center",
    color: "#64748b",
    fontSize: 9.5,
  },
  compareInfo: {
    marginTop: 8,
    fontSize: 8.3,
    color: "#64748b",
  },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signature: {
    fontSize: 16,
    color: "#304b28",
    marginBottom: 2,
  },
  crn: {
    fontSize: 10,
    color: "#304b28",
  },
  smallLogo: {
    width: 54,
    height: 54,
    objectFit: "contain",
  },
  footerNote: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: "#f4f7ef",
    borderWidth: 1,
    borderColor: "#d8e1cd",
    padding: 10,
    textAlign: "center",
    color: "#355227",
    fontSize: 10,
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
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyTable}>Sem medidas lançadas.</Text>
      ) : (
        <View style={styles.tableBodyWrap}>
          <View style={styles.tableHeader}>
            <Text style={styles.colLabel}>Parâmetro</Text>
            {compare ? <Text style={styles.colPrev}>Antes</Text> : null}
            <Text style={styles.colCurrent}>Atual</Text>
          </View>
          {rows.map((row) => (
            <View style={styles.tableRow} key={row.key}>
              <Text style={styles.colLabel}>{row.label}</Text>
              {compare ? <Text style={styles.colPrev}>{toFixedPt(row.anterior)}</Text> : null}
              <Text style={styles.colCurrent}>{toFixedPt(row.atual)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
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
  const prevDate = dados.previousSummary?.createdAt ? new Date(dados.previousSummary.createdAt).toLocaleDateString("pt-BR") : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Composição corporal</Text>
            <View style={styles.splitRow}>
              <View style={styles.leftCol}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Peso Atual</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.pesoKg)} kg</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>% de Água corporal</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.pctAgua)}%</Text>
                </View>
                <Text style={{ ...styles.badge, color: colorForClassificacao(dados.classificacaoAgua), backgroundColor: bgForClassificacao(dados.classificacaoAgua) }}>
                  {dados.classificacaoAgua?.label || "—"}
                </Text>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Massa Magra</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.massaMagraKg)} kg</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Massa Gorda</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.massaGordaKg)} kg</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>% de Gordura Corporal</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.bfPct)}%</Text>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricPillMuscle}>
                    <Text style={styles.metricPillTitleMuscle}>Músculo Esquelético</Text>
                    <Text style={styles.metricPillValue}>{toFixedPt(dados.imme, 2)} kg/m²</Text>
                    <Text style={styles.metricPillStatus}>{dados.classificacaoImme?.label || "Resultado"}</Text>
                  </View>
                  <View style={styles.metricPillFat}>
                    <Text style={styles.metricPillTitleFat}>Índice de Massa Gorda</Text>
                    <Text style={styles.metricPillValue}>{toFixedPt(dados.img, 2)} kg/m²</Text>
                    <Text style={styles.metricPillStatus}>{dados.classificacaoImg?.label || "Resultado"}</Text>
                  </View>
                  <View style={styles.metricPillMuscle}>
                    <Text style={styles.metricPillTitleMuscle}>Massa Livre de Gordura</Text>
                    <Text style={styles.metricPillValue}>{toFixedPt(dados.ffmi, 2)} kg/m²</Text>
                    <Text style={styles.metricPillStatus}>Resultado</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rightCol}>
                {frente ? <Image src={frente} style={styles.bodyImageFront} /> : null}
              </View>
            </View>
          </View>

          <View style={styles.card}>
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
            <Text style={styles.compareInfo}>
              {compare && prevDate
                ? `Comparação ativa com a avaliação de ${prevDate}.`
                : "Primeira avaliação ou comparação desativada: exibindo somente o resultado atual."}
            </Text>
          </View>

          <ComparisonTable title="Circunferências" rows={circRows} compare={compare} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dobras</Text>
            <View style={styles.splitRow}>
              <View style={{ ...styles.leftCol, width: compare ? "58%" : "56%" }}>
                {dobraRows.length === 0 ? (
                  <Text style={styles.emptyTable}>Sem medidas lançadas.</Text>
                ) : (
                  <View style={styles.tableBodyWrap}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.colLabel}>Parâmetro</Text>
                      {compare ? <Text style={styles.colPrev}>Antes</Text> : null}
                      <Text style={styles.colCurrent}>Atual</Text>
                    </View>
                    {dobraRows.map((row) => (
                      <View style={styles.tableRow} key={row.key}>
                        <Text style={styles.colLabel}>{row.label}</Text>
                        {compare ? <Text style={styles.colPrev}>{toFixedPt(row.anterior)}</Text> : null}
                        <Text style={styles.colCurrent}>{toFixedPt(row.atual)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.rightCol}>
                {lateral ? <Image src={lateral} style={styles.bodyImageSide} /> : null}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Resultados calculados a partir do protocolo selecionado{dados.protocolLabel ? `: ${dados.protocolLabel}` : ""}.
        </Text>

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
