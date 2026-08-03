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
} from "@react-pdf/renderer";

type Classificacao = {
  status?: string;
  cor?: "verde" | "amarelo";
  label?: string;
};

type PdfProps = {
  paciente: {
    nome: string;
    sexo: "M" | "F";
    idade: number;
    altura_cm: number;
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
  };
  nutricionista: {
    nome: string;
    crn: string;
    email?: string;
  };
};

function toFixedPt(value: number | null | undefined, digits = 1) {
  const safe = Number.isFinite(value as number) ? Number(value) : 0;
  return safe.toFixed(digits).replace(".", ",");
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
    opacity: 0.09,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  headerText: {
    flexGrow: 1,
  },
  patientName: {
    fontSize: 20,
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
    color: "#355227",
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
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 12,
    minHeight: 242,
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
    width: "62%",
    gap: 6,
  },
  rightCol: {
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyImageFront: {
    width: 105,
    height: 160,
    objectFit: "contain",
  },
  bodyImageSide: {
    width: 92,
    height: 168,
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
    fontSize: 9.4,
    width: "60%",
  },
  kvValue: {
    color: "#1f2937",
    fontSize: 9.4,
    fontWeight: 700,
    textAlign: "right",
    width: "40%",
  },
  badge: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 8.6,
    fontWeight: 700,
    alignSelf: "flex-start",
  },
  metricLine: {
    marginTop: 6,
    padding: 7,
    borderRadius: 8,
    backgroundColor: "#f7f9f4",
  },
  metricLineStrong: {
    fontWeight: 700,
  },
  rightCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexGrow: 1,
  },
  metricsCol: {
    width: "62%",
  },
  imageCol: {
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
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
  resultHeader: {
    fontSize: 10.5,
    color: "#3a4f31",
    marginBottom: 8,
  },
  bullet: {
    marginBottom: 4,
    color: "#334155",
  },
});

export function AvaliacaoPdfDocument({ paciente, dados, nutricionista }: PdfProps) {
  const logo = fileToDataUri("/logo-nutricare.png");
  const fundo = fileToDataUri("/fundo-layout.jpg") || fileToDataUri("/layouts/fundo-layout.jpg");
  const { frente, lateral } = resolveImagePair(dados, paciente.sexo);
  const nomeNutri = nutricionista?.nome || "Nutricionista";
  const crn = nutricionista?.crn || "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {fundo ? <Image src={fundo} style={styles.bg} /> : null}

        <View style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <View style={styles.logo} />}

          <View style={styles.headerText}>
            <Text style={styles.patientName}>{paciente.nome}</Text>
            <Text style={styles.patientMeta}>
              data: {dados.data} | idade: {paciente.idade} anos | sexo: {labelSexo(paciente.sexo)}
            </Text>
            <Text style={styles.patientMeta}>
              altura: {toFixedPt(paciente.altura_cm, 0)} cm | peso atual: {toFixedPt(dados.pesoKg)} kg
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
                  <Text style={styles.kvLabel}>Peso atual</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.pesoKg)} kg</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Percentual de água</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.pctAgua)}%</Text>
                </View>
                <Text
                  style={{
                    ...styles.badge,
                    color: colorForClassificacao(dados.classificacaoAgua),
                    backgroundColor: bgForClassificacao(dados.classificacaoAgua),
                  }}
                >
                  {dados.classificacaoAgua?.label || "—"}
                </Text>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Massa magra</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.massaMagraKg)} kg</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Massa gorda</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.massaGordaKg)} kg</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>% Gordura corporal</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.bfPct)}%</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>IMME</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.imme, 2)} kg/m²</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>IMG</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.img, 2)} kg/m²</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>FFMI</Text>
                  <Text style={styles.kvValue}>{toFixedPt(dados.ffmi, 2)} kg/m²</Text>
                </View>
              </View>

              <View style={styles.rightCol}>
                {frente ? <Image src={frente} style={styles.bodyImageFront} /> : null}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultados</Text>
            <Text style={styles.resultHeader}>Classificações calculadas pelo sistema</Text>

            <View style={styles.metricLine}>
              <Text>
                <Text style={styles.metricLineStrong}>IMME:</Text> {toFixedPt(dados.imme, 2)} kg/m² — {dados.classificacaoImme?.label || "—"}
              </Text>
            </View>
            <View style={styles.metricLine}>
              <Text>
                <Text style={styles.metricLineStrong}>IMG:</Text> {toFixedPt(dados.img, 2)} kg/m² — {dados.classificacaoImg?.label || "—"}
              </Text>
            </View>
            <View style={styles.metricLine}>
              <Text>
                <Text style={styles.metricLineStrong}>FFMI:</Text> {toFixedPt(dados.ffmi, 2)} kg/m²
              </Text>
            </View>
            <View style={styles.metricLine}>
              <Text>
                <Text style={styles.metricLineStrong}>Água corporal:</Text> {toFixedPt(dados.pctAgua)}% — {dados.classificacaoAgua?.label || "—"}
              </Text>
            </View>
            <View style={styles.metricLine}>
              <Text>
                <Text style={styles.metricLineStrong}>Imagem corporal aplicada:</Text> {dados.legendaImagem || "Perfil corporal automático"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Referências do sistema</Text>
            <Text style={styles.bullet}>• IMME = massa muscular esquelética / altura²</Text>
            <Text style={styles.bullet}>• IMG = massa gorda / altura²</Text>
            <Text style={styles.bullet}>• FFMI = massa livre de gordura / altura²</Text>
            <Text style={styles.bullet}>• % de água classificado conforme sexo do paciente</Text>
            <Text style={styles.bullet}>• Imagem frontal e lateral definidas pelo sexo + FFMI + % gordura</Text>

            <View style={[styles.metricLine, { marginTop: 10 }]}> 
              <Text>
                <Text style={styles.metricLineStrong}>Sexo identificado:</Text> {labelSexo(paciente.sexo)}
              </Text>
            </View>
            <View style={styles.metricLine}>
              <Text>
                <Text style={styles.metricLineStrong}>Legenda corporal:</Text> {dados.legendaImagem || "—"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Imagem lateral</Text>
            <View style={styles.rightCardContent}>
              <View style={styles.metricsCol}>
                <View style={styles.metricLine}>
                  <Text>
                    <Text style={styles.metricLineStrong}>Sexo:</Text> {labelSexo(paciente.sexo)}
                  </Text>
                </View>
                <View style={styles.metricLine}>
                  <Text>
                    <Text style={styles.metricLineStrong}>FFMI:</Text> {toFixedPt(dados.ffmi, 2)} kg/m²
                  </Text>
                </View>
                <View style={styles.metricLine}>
                  <Text>
                    <Text style={styles.metricLineStrong}>BF%:</Text> {toFixedPt(dados.bfPct)}%
                  </Text>
                </View>
                <View style={styles.metricLine}>
                  <Text>
                    <Text style={styles.metricLineStrong}>Perfil escolhido:</Text> {dados.legendaImagem || "—"}
                  </Text>
                </View>
              </View>

              <View style={styles.imageCol}>
                {lateral ? <Image src={lateral} style={styles.bodyImageSide} /> : null}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Este documento foi gerado automaticamente com base nos dados da antropometria e nas tabelas de composição corporal configuradas no sistema.
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
