// lib/avaliacaoPdf.tsx
// Layout do PDF de Avaliação Física (idêntico ao mock).
// - Título "AVALIAÇÃO FÍSICA" em preto (removido o subtítulo "Composição Corporal")
// - Composição corporal com colunas: Parâmetro / Resultado / Referência / Avaliação
//   - Avaliação usa pill: Ótimo / Bom / Atenção  (verde / verde / amarelo)
//     e "Adequado" para % de água (bolinha amarela)
// - Circunferências e Dobras: duas colunas de resultado — ANTES e ATUAL
//   (se não medido = "—")
// - Bloco Evolução com 3 pontos (1ª, 2ª e 3ª avaliação — rotativas conforme regra)
// - Rodapé Evolução Comparativa com Peso / Massa Muscular / % Gordura
// - Assinatura "Nutricionista: ..." em fonte manuscrita GreatVibes
// - Emojis: 💪 Massa muscular / 🔥 % Gordura / 💧 Água / 🏋️ Músculo esquelético / 📏 IMG

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
    // Classificações (calculadas em resumoCompleto)
    classificacaoAgua?: { cor: "verde" | "amarelo"; label: string };
    classificacaoImg?: { cor: "verde" | "amarelo"; label: string };
    classificacaoFfmi?: { cor: "verde" | "amarelo"; label: string };
    classificacaoGordura?: { cor: "verde" | "amarelo"; label: string };
    // Imagens do biotipo
    imagemFrenteUrl?: string;
    imagemLateralUrl?: string;
    // Comparação
    compareResults?: boolean;
    currentDobras?: MeasurementMap;
    currentCircunferencias?: MeasurementMap;
    previousDobras?: MeasurementMap;
    previousCircunferencias?: MeasurementMap;
    previousSummary?: SummarySnapshot | null;
    // Evolução (1ª / 2ª / 3ª) — vindas do banco
    evolucao?: EvolucaoPonto[];
    dataAvaliacaoInicial?: string | null; // "desde 20/03/2024"
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
  "coxa_proximal",
] as const;

// ---------- Helpers ----------
function absPublic(relPath?: string) {
  if (!relPath) return null;
  const clean = relPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", clean);
}

const greatVibesPath = absPublic("/fonts/GreatVibes-Regular.ttf") || absPublic("/GreatVibes-Regular.ttf");
if (greatVibesPath && fs.existsSync(greatVibesPath)) {
  try {
    Font.register({ family: "GreatVibes", src: greatVibesPath });
  } catch {
    // ignore double register
  }
}

function toFixedPt(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(digits).replace(".", ",");
}

function formatBirth(value?: string | null) {
  if (!value) return "—";
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

function hasPositive(v: number | null | undefined) {
  return v !== null && v !== undefined && Number(v) > 0;
}

function pct(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return ((a - b) / b) * 100;
}

// ---------- Estilos ----------
const GREEN = "#2f5d31";
const GREEN_SOFT = "#dde7d0";
const BORDER = "#c9d3b8";
const YELLOW_BG = "#fff7cf";
const YELLOW_TXT = "#a16207";
const GREEN_BG = "#d9f2c8";
const GREEN_TXT = "#166534";
const RED = "#b91c1c";
const BLUE = "#2563eb";

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 18,
    fontSize: 8,
    color: "#1c2712",
    backgroundColor: "#ffffff",
  },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.08 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  logo: { width: 34, height: 34, objectFit: "contain" },
  headerText: { flexGrow: 1 },
  patientName: { fontSize: 11, fontWeight: 800, color: "#111" },
  patientMeta: { fontSize: 7.6, color: "#334", marginTop: 0.5 },
  divider: { height: 0.8, backgroundColor: "#8a9a6b", marginTop: 3, marginBottom: 5 },
  title: {
    fontSize: 17,
    fontWeight: 800,
    textAlign: "center",
    color: "#000000",
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 5,
    backgroundColor: "#ffffff",
  },
  compTop: { width: "63%" },
  compRight: { width: "35%", alignItems: "center", justifyContent: "center", padding: 4 },

  cardTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: GREEN,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  tHead: {
    flexDirection: "row",
    paddingBottom: 2,
    marginBottom: 2,
  },
  tHeadTxt: { fontSize: 7, color: "#4b5c37", fontWeight: 700 },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1.4,
    borderBottomWidth: 0.3,
    borderBottomColor: "#eef1e6",
  },
  colParam: { width: "38%", flexDirection: "row", alignItems: "center", gap: 3 },
  colParamText: { fontSize: 7.4, color: "#1c2712" },
  colResult: { width: "22%", fontSize: 7.4, color: "#111", textAlign: "left" },
  colRef: { width: "20%", fontSize: 7.4, color: "#334", textAlign: "left" },
  colEval: { width: "20%", textAlign: "left" },

  pill: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    alignSelf: "flex-start",
    fontSize: 6.8,
    fontWeight: 700,
  },
  pillGreen: { backgroundColor: GREEN_BG, color: GREEN_TXT },
  pillYellow: { backgroundColor: YELLOW_BG, color: YELLOW_TXT },
  pillNeutral: { backgroundColor: "#eef1e6", color: "#4b5c37" },

  emoji: { fontSize: 8.4 },

  // Circunf / Dobras
  colParam2: { width: "44%", flexDirection: "row", alignItems: "center", gap: 3 },
  colVal2: { width: "28%", fontSize: 7.2, color: "#111", textAlign: "center" },

  // Evolução charts
  chartTitle: { fontSize: 7.2, color: "#334", fontWeight: 700, marginBottom: 1 },
  chartBlock: { marginBottom: 3 },

  // Rodapé comparativo
  footerRow: { flexDirection: "row", justifyContent: "space-between", gap: 5 },
  footerCard: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 5,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  footerLabel: { fontSize: 8, color: "#334", marginBottom: 2, fontWeight: 700 },
  footerBig: { fontSize: 12, fontWeight: 800, color: "#111" },
  footerDelta: { fontSize: 7.2, marginTop: 1 },
  footerSince: { fontSize: 6.8, color: "#64748b", marginTop: 1 },

  signWrap: { marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  signName: { fontSize: 13, fontFamily: "GreatVibes", color: "#111" },
  signCrn: { fontSize: 8, color: "#111", fontFamily: "GreatVibes" },
  footerLogo: { width: 30, height: 30, objectFit: "contain" },

  bodyFront: { width: 110, height: 180, objectFit: "contain" },
});

// ---------- Pills ----------
function EvalPill({ cor, label }: { cor?: "verde" | "amarelo"; label?: string }) {
  if (!label) return <Text style={[styles.pill, styles.pillNeutral]}>—</Text>;
  const s = cor === "amarelo" ? styles.pillYellow : styles.pillGreen;
  return <Text style={[styles.pill, s]}>{label}</Text>;
}

// ---------- Chart de evolução (3 pontos) ----------
function EvolutionChart({
  title,
  points,
  colorLine,
  colorDot,
  unit = "",
}: {
  title: string;
  points: Array<{ data: string; value: number | null | undefined }>;
  colorLine: string;
  colorDot: string;
  unit?: string;
}) {
  const width = 190;
  const height = 56;
  const left = 18;
  const top = 6;
  const chartW = 160;
  const chartH = 32;

  const filtered = points.filter((p) => hasPositive(p.value));
  const vals = filtered.map((p) => Number(p.value));
  const min = vals.length ? Math.min(...vals) - 1.5 : 0;
  const max = vals.length ? Math.max(...vals) + 1.5 : 1;

  const projected = points.map((p, i) => {
    const x = left + (i * chartW) / Math.max(1, points.length - 1);
    const y =
      hasPositive(p.value)
        ? top + chartH - ((Number(p.value) - min) / Math.max(0.5, max - min)) * chartH
        : top + chartH / 2;
    return { ...p, x, y };
  });

  const linePts = projected.filter((p) => hasPositive(p.value));

  return (
    <View style={styles.chartBlock}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={6} ry={6} fill="#fafcf6" />
        {linePts.length >= 2 ? (
          <Polyline
            points={linePts.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke={colorLine}
            strokeWidth={1.4}
            fill="none"
          />
        ) : null}
        {projected.map((p, i) => (
          <React.Fragment key={i}>
            {hasPositive(p.value) ? (
              <>
                <Circle cx={p.x} cy={p.y} r={2.2} fill={colorDot} />
                <Text
                  style={{
                    position: "absolute",
                    left: p.x - 12,
                    top: p.y - 10,
                    fontSize: 6.6,
                    color: "#111",
                    fontWeight: 700,
                  }}
                >
                  {toFixedPt(Number(p.value))}
                  {unit}
                </Text>
              </>
            ) : null}
            <Text
              style={{
                position: "absolute",
                left: p.x - 12,
                top: top + chartH + 4,
                fontSize: 6.4,
                color: "#64748b",
              }}
            >
              {p.data}
            </Text>
          </React.Fragment>
        ))}
      </Svg>
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

  // Referência: valores do próprio mock/tabela
  const refAgua = "50 – 65 %";
  const refImg = "—";
  const refBf = paciente.sexo === "F" ? "20 – 30 %" : "16 – 28 %";

  const evolucao = (dados.evolucao || []).slice(-3);
  const pesoPontos = evolucao.map((p) => ({ data: p.data, value: p.peso }));
  const musculoPontos = evolucao.map((p) => ({ data: p.data, value: p.massaMuscular }));
  const bfPontos = evolucao.map((p) => ({ data: p.data, value: p.bfPct }));

  // Circunf/Dobras
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

  // Rodapé comparativo (Peso / MM / %G) — usa 1ª avaliação como base
  const baseSummary = previous || null;
  const deltaPeso = baseSummary && baseSummary.pesoKg ? dados.pesoKg - Number(baseSummary.pesoKg) : null;
  const deltaMM =
    baseSummary && baseSummary.massaMuscularKg
      ? dados.massaMagraKg - Number(baseSummary.massaMuscularKg)
      : null;
  const deltaBF =
    baseSummary && baseSummary.bodyFatPct !== null && baseSummary.bodyFatPct !== undefined
      ? dados.bfPct - Number(baseSummary.bodyFatPct)
      : null;
  const pctPeso = baseSummary?.pesoKg ? pct(dados.pesoKg, Number(baseSummary.pesoKg)) : null;
  const pctMM = baseSummary?.massaMuscularKg
    ? pct(dados.massaMagraKg, Number(baseSummary.massaMuscularKg))
    : null;
  const pctBF = baseSummary?.bodyFatPct ? pct(dados.bfPct, Number(baseSummary.bodyFatPct)) : null;

  const desde = dados.dataAvaliacaoInicial
    ? `desde ${new Date(dados.dataAvaliacaoInicial).toLocaleDateString("pt-BR")}`
    : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {fundo ? <Image src={fundo} style={styles.bg} /> : null}

        {/* Cabeçalho */}
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

        <View style={styles.divider} />
        <Text style={styles.title}>AVALIAÇÃO FÍSICA</Text>

        {/* Bloco superior: Composição corporal (esq.) + Imagem biotipo (dir.) */}
        <View style={styles.row}>
          <View style={[styles.card, styles.compTop]}>
            <Text style={styles.cardTitle}>COMPOSIÇÃO CORPORAL</Text>
            <View style={styles.tHead}>
              <Text style={[styles.tHeadTxt, { width: "38%" }]}>Parâmetro</Text>
              <Text style={[styles.tHeadTxt, { width: "22%" }]}>Resultado</Text>
              <Text style={[styles.tHeadTxt, { width: "20%" }]}>Referência</Text>
              <Text style={[styles.tHeadTxt, { width: "20%" }]}>Avaliação</Text>
            </View>

            {/* Peso */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>⚖️</Text>
                <Text style={styles.colParamText}>Peso</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.pesoKg)} kg</Text>
              <Text style={styles.colRef}>—</Text>
              <View style={styles.colEval}>
                <EvalPill />
              </View>
            </View>

            {/* Água — círculo amarelo */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>💧</Text>
                <Text style={styles.colParamText}>% de água corporal</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.pctAgua)} %</Text>
              <Text style={styles.colRef}>{refAgua}</Text>
              <View style={styles.colEval}>
                <EvalPill
                  cor={dados.classificacaoAgua?.cor}
                  label={dados.classificacaoAgua?.label || "Adequado"}
                />
              </View>
            </View>

            {/* Massa muscular */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>💪</Text>
                <Text style={styles.colParamText}>Massa muscular</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <Text style={styles.colRef}>—</Text>
              <View style={styles.colEval}>
                <EvalPill />
              </View>
            </View>

            {/* Músculo esquelético */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>🏋️</Text>
                <Text style={styles.colParamText}>Músculo esquelético</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.imme)} kg</Text>
              <Text style={styles.colRef}>—</Text>
              <View style={styles.colEval}>
                <EvalPill />
              </View>
            </View>

            {/* Massa livre de gordura */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>🧩</Text>
                <Text style={styles.colParamText}>Massa livre de gordura</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              <Text style={styles.colRef}>—</Text>
              <View style={styles.colEval}>
                <EvalPill cor={dados.classificacaoFfmi?.cor} label={dados.classificacaoFfmi?.label} />
              </View>
            </View>

            {/* Massa adiposa */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>🟠</Text>
                <Text style={styles.colParamText}>Massa adiposa</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.massaGordaKg)} kg</Text>
              <Text style={styles.colRef}>—</Text>
              <View style={styles.colEval}>
                <EvalPill />
              </View>
            </View>

            {/* Índice de massa gorda */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>📏</Text>
                <Text style={styles.colParamText}>Índice de massa gorda</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.img, 2)} kg/m²</Text>
              <Text style={styles.colRef}>—</Text>
              <View style={styles.colEval}>
                <EvalPill cor={dados.classificacaoImg?.cor} label={dados.classificacaoImg?.label} />
              </View>
            </View>

            {/* % de gordura */}
            <View style={styles.tRow}>
              <View style={styles.colParam}>
                <Text style={styles.emoji}>🔥</Text>
                <Text style={styles.colParamText}>% de gordura</Text>
              </View>
              <Text style={styles.colResult}>{toFixedPt(dados.bfPct)} %</Text>
              <Text style={styles.colRef}>{refBf}</Text>
              <View style={styles.colEval}>
                <EvalPill cor={dados.classificacaoGordura?.cor} label={dados.classificacaoGordura?.label} />
              </View>
            </View>
          </View>

          {/* Imagem biotipo */}
          <View style={[styles.card, styles.compRight]}>
            <Text style={[styles.cardTitle, { alignSelf: "center" }]}>COMPOSIÇÃO CORPORAL</Text>
            {frente ? <Image src={frente} style={styles.bodyFront} /> : <View style={styles.bodyFront} />}
          </View>
        </View>

        {/* Bloco meio: Circunferências / Dobras / Evolução */}
        <View style={styles.row}>
          {/* Circunferências */}
          <View style={[styles.card, { width: "34%" }]}>
            <Text style={styles.cardTitle}>CIRCUNFERÊNCIAS</Text>
            <View style={styles.tHead}>
              <Text style={[styles.tHeadTxt, { width: "44%" }]}>Medida</Text>
              {compare ? <Text style={[styles.tHeadTxt, { width: "28%", textAlign: "center" }]}>Antes</Text> : null}
              <Text style={[styles.tHeadTxt, { width: compare ? "28%" : "56%", textAlign: "center" }]}>
                {compare ? "Atual" : "Resultado (cm)"}
              </Text>
            </View>
            {circRows.length === 0 ? (
              <Text style={{ fontSize: 8, color: "#64748b" }}>Nenhuma circunferência registrada.</Text>
            ) : (
              circRows.map((r) => (
                <View key={r.key} style={styles.tRow}>
                  <View style={styles.colParam2}>
                    <Text style={styles.emoji}>📐</Text>
                    <Text style={styles.colParamText}>{r.label}</Text>
                  </View>
                  {compare ? (
                    <Text style={styles.colVal2}>{hasPositive(r.antes) ? `${toFixedPt(r.antes)}` : "—"}</Text>
                  ) : null}
                  <Text style={[styles.colVal2, { width: compare ? "28%" : "56%" }]}>
                    {hasPositive(r.atual) ? `${toFixedPt(r.atual)}` : "—"}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Dobras */}
          <View style={[styles.card, { width: "31%" }]}>
            <Text style={styles.cardTitle}>DOBRAS CUTÂNEAS (mm)</Text>
            <View style={styles.tHead}>
              <Text style={[styles.tHeadTxt, { width: "44%" }]}>Dobra</Text>
              {compare ? <Text style={[styles.tHeadTxt, { width: "28%", textAlign: "center" }]}>Antes</Text> : null}
              <Text style={[styles.tHeadTxt, { width: compare ? "28%" : "56%", textAlign: "center" }]}>
                {compare ? "Atual" : "Resultado (mm)"}
              </Text>
            </View>
            {dobraRows.length === 0 ? (
              <Text style={{ fontSize: 8, color: "#64748b" }}>Nenhuma dobra registrada.</Text>
            ) : (
              dobraRows.map((r) => (
                <View key={r.key} style={styles.tRow}>
                  <View style={styles.colParam2}>
                    <Text style={styles.emoji}>🤏</Text>
                    <Text style={styles.colParamText}>{r.label}</Text>
                  </View>
                  {compare ? (
                    <Text style={styles.colVal2}>{hasPositive(r.antes) ? `${toFixedPt(r.antes)}` : "—"}</Text>
                  ) : null}
                  <Text style={[styles.colVal2, { width: compare ? "28%" : "56%" }]}>
                    {hasPositive(r.atual) ? `${toFixedPt(r.atual)}` : "—"}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Evolução */}
          <View style={[styles.card, { width: "32%" }]}>
            <Text style={styles.cardTitle}>EVOLUÇÃO</Text>
            <EvolutionChart title="⚖️  Peso (kg)" points={pesoPontos} colorLine="#2f5d31" colorDot="#2f5d31" />
            <EvolutionChart
              title="💪  Massa Muscular (kg)"
              points={musculoPontos}
              colorLine={BLUE}
              colorDot={BLUE}
            />
            <EvolutionChart title="🔥  % de Gordura (%)" points={bfPontos} colorLine={RED} colorDot={RED} unit="" />
          </View>
        </View>

        {/* Rodapé comparativo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EVOLUÇÃO COMPARATIVA</Text>
          <View style={styles.footerRow}>
            {/* Peso */}
            <View style={styles.footerCard}>
              <Text style={styles.footerLabel}>⚖️  Peso</Text>
              <Text style={styles.footerBig}>{toFixedPt(dados.pesoKg)} kg</Text>
              {deltaPeso !== null ? (
                <Text style={[styles.footerDelta, { color: deltaPeso <= 0 ? "#166534" : "#b91c1c" }]}>
                  {deltaPeso > 0 ? "+" : ""}
                  {toFixedPt(deltaPeso)} kg ({pctPeso !== null && pctPeso > 0 ? "+" : ""}
                  {toFixedPt(pctPeso ?? 0, 2)}%)
                </Text>
              ) : (
                <Text style={styles.footerDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footerSince}>{desde}</Text> : null}
            </View>

            {/* Massa Muscular */}
            <View style={styles.footerCard}>
              <Text style={[styles.footerLabel, { color: BLUE }]}>💪  Massa Muscular</Text>
              <Text style={styles.footerBig}>{toFixedPt(dados.massaMagraKg)} kg</Text>
              {deltaMM !== null ? (
                <Text style={[styles.footerDelta, { color: deltaMM >= 0 ? "#166534" : "#b91c1c" }]}>
                  {deltaMM > 0 ? "+" : ""}
                  {toFixedPt(deltaMM)} kg ({pctMM !== null && pctMM > 0 ? "+" : ""}
                  {toFixedPt(pctMM ?? 0, 2)}%)
                </Text>
              ) : (
                <Text style={styles.footerDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footerSince}>{desde}</Text> : null}
            </View>

            {/* % de gordura */}
            <View style={styles.footerCard}>
              <Text style={[styles.footerLabel, { color: RED }]}>🔥  % de Gordura</Text>
              <Text style={styles.footerBig}>{toFixedPt(dados.bfPct)} %</Text>
              {deltaBF !== null ? (
                <Text style={[styles.footerDelta, { color: deltaBF <= 0 ? "#166534" : "#b91c1c" }]}>
                  {deltaBF > 0 ? "+" : ""}
                  {toFixedPt(deltaBF)} % ({pctBF !== null && pctBF > 0 ? "+" : ""}
                  {toFixedPt(pctBF ?? 0, 2)}%)
                </Text>
              ) : (
                <Text style={styles.footerDelta}>—</Text>
              )}
              {desde ? <Text style={styles.footerSince}>{desde}</Text> : null}
            </View>
          </View>
        </View>

        {/* Assinatura */}
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
