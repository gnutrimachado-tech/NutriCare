// lib/avaliacaoPdf.tsx
// Definição do PDF de Avaliação Física (renderizado por @react-pdf/renderer).
//
// IMPORTANTE: este arquivo é .tsx (e não .ts) propositadamente.
// Os arquivos "route.ts" do Next.js + Turbopack NÃO aceitam JSX inline -
// é o bug que apareceu no seu build ("Expected '>', got 'ident'").
// Aqui o JSX é livre e as rotas chamam este componente via React.createElement.

import {
  Document,
  Page,
  Text,
  View,
  Image as PdfImage,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

let greatVibesRegistrada = false;
function registrarFonteGreatVibes() {
  if (greatVibesRegistrada) return;
  try {
    Font.register({
      family: "GreatVibes",
      src: "/fonts/GreatVibes-Regular.ttf", // já em /public/fonts no seu repo
    });
    greatVibesRegistrada = true;
  } catch {
    // silencioso - o PDF ainda gera sem a fonte estilizada
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: "#0F3D2E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#0F3D2E",
    paddingBottom: 10,
    marginBottom: 14,
  },
  logoBox: { flexDirection: "row", alignItems: "center" },
  logoImg: { width: 56, height: 56, marginRight: 10 },
  titulo: { fontSize: 22, fontWeight: "bold", color: "#0F3D2E" },
  subtitulo: { fontSize: 10, color: "#5C6F66" },
  nomeCliente: { fontSize: 14, fontWeight: "bold" },
  dadosCliente: { fontSize: 9, color: "#5C6F66", textAlign: "right" },

  card: {
    borderWidth: 1,
    borderColor: "#D9E5DD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTitulo: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F3D2E",
    marginBottom: 8,
    letterSpacing: 1,
  },
  separador: {
    borderTopWidth: 0.5,
    borderTopColor: "#D9E5DD",
    marginTop: 6,
    paddingTop: 6,
  },

  linha: { flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  rotulo: { width: 200, fontSize: 10, color: "#0F3D2E" },
  valor: { width: 100, fontSize: 10, fontWeight: "bold" },
  bolinha: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  textoCor: { fontSize: 10, fontWeight: "bold" },

  imagemCentro: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  imagemFrontal: { width: 200, height: 320, objectFit: "contain" },

  cols: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  table: { width: "100%" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5ECE8",
    paddingVertical: 3,
  },
  th: { fontSize: 9, fontWeight: "bold", width: "40%" },
  td: { fontSize: 9, width: "30%" },

  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#0F3D2E",
    paddingTop: 10,
    alignItems: "center",
  },
  assinaturaNome: { fontFamily: "GreatVibes", fontSize: 30, color: "#0F3D2E" },
  assinaturaLinha: { height: 1, backgroundColor: "#0F3D2E", marginTop: 2 },
  assinaturaLarguraWrap: { alignItems: "center", marginTop: 6 },
  assinaturaCrn: { fontSize: 10, marginTop: 4 },
});

const COR_BG: Record<string, string> = {
  verde: "#1AB05B",
  amarelo: "#E5A700",
  vermelho: "#C0392B",
};

export interface ResumoBodyData {
  data: string;
  pesoKg: number;
  pctAgua: number;
  massaMagraKg: number;
  massaGordaKg: number;
  bfPct: number;
  imme: number;
  img: number;
  ffmi: number;
  classificacaoAgua: { status: string; cor: "verde" | "amarelo"; label: string };
  classificacaoImme: { status: string; cor: "verde" | "amarelo"; label: string };
  classificacaoImg: { status: string; cor: "verde" | "amarelo"; label: string };
  imagemUrl: string;
  legendaImagem: string;
}

export interface AvaliacaoPdfProps {
  paciente: {
    nome: string;
    sexo: "M" | "F";
    idade: number;
    altura_cm?: number;
  };
  dados: ResumoBodyData;
  circunferencias?: { label: string; antes?: number | null; atual?: number | null }[];
  dobras?: { label: string; antes?: number | null; atual?: number | null }[];
  nutricionista: { nome: string; crn: string; email?: string };
  logoUrl?: string;
}

export function AvaliacaoPdfDocument(props: AvaliacaoPdfProps) {
  registrarFonteGreatVibes();
  const { paciente, dados, nutricionista, logoUrl = "/logo.png" } = props;
  const c = dados;
  const fmt = (n?: number | null, suf = "") =>
    n == null || !Number.isFinite(n) ? "—" : `${n}${suf}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <PdfImage src={logoUrl} style={styles.logoImg} />
            <View>
              <Text style={styles.titulo}>NutriCare</Text>
              <Text style={styles.subtitulo}>AVALIAÇÃO FÍSICA</Text>
            </View>
          </View>
          <View>
            <Text style={styles.nomeCliente}>{paciente.nome}</Text>
            <Text style={styles.dadosCliente}>
              Sexo: {paciente.sexo === "M" ? "Masculino" : "Feminino"} · Idade: {paciente.idade}
              {paciente.altura_cm ? ` · Altura: ${paciente.altura_cm}cm` : ""}
            </Text>
            <Text style={styles.dadosCliente}>Data: {c.data}</Text>
          </View>
        </View>

        {/* Composição Corporal */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>COMPOSIÇÃO CORPORAL</Text>

          <Linha rotulo="Peso Atual" valor={`${c.pesoKg.toFixed(1)} kg`} />
          <Linha
            rotulo="% de Água"
            valor={`${c.pctAgua.toFixed(1)}%`}
            cor={c.classificacaoAgua.cor}
            label={c.classificacaoAgua.label}
          />
          <Linha rotulo="Massa Magra" valor={`${c.massaMagraKg.toFixed(1)} kg`} />
          <Linha rotulo="Massa Gorda" valor={`${c.massaGordaKg.toFixed(1)} kg`} />
          <Linha rotulo="% Gordura Corporal" valor={`${c.bfPct.toFixed(1)}%`} />

          <View style={styles.separador}>
            <Linha
              rotulo="IMME (Músculo Esquelético)"
              valor={`${c.imme.toFixed(2)} kg/m²`}
              cor={c.classificacaoImme.cor}
              label={c.classificacaoImme.label}
            />
            <Linha
              rotulo="IMG (Índice Massa Gorda)"
              valor={`${c.img.toFixed(2)} kg/m²`}
              cor={c.classificacaoImg.cor}
              label={c.classificacaoImg.label}
            />
            <Linha rotulo="FFMI" valor={`${c.ffmi.toFixed(2)} kg/m²`} />
          </View>
        </View>

        {/* Imagem central selecionada por sexo + FFMI + BF% */}
        <View style={styles.imagemCentro}>
          <PdfImage src={c.imagemUrl} style={styles.imagemFrontal} />
          <Text style={[styles.dadosCliente, { marginTop: 4 }]}>
            {c.legendaImagem}
          </Text>
        </View>

        {/* Circunferências + Dobras lado a lado */}
        <View style={styles.cols}>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardTitulo}>CIRCUNFERÊNCIAS</Text>
            {props.circunferencias && props.circunferencias.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.th}>Medida</Text>
                  <Text style={styles.td}>Antes</Text>
                  <Text style={styles.td}>Atual</Text>
                </View>
                {props.circunferencias.map((r) => (
                  <View key={r.label} style={styles.tableRow}>
                    <Text style={styles.th}>{r.label}</Text>
                    <Text style={styles.td}>{fmt(r.antes, " cm")}</Text>
                    <Text style={styles.td}>{fmt(r.atual, " cm")}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.subtitulo}>Sem medições registradas.</Text>
            )}
          </View>

          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardTitulo}>DOBRAS CUTÂNEAS</Text>
            {props.dobras && props.dobras.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.th}>Dobra</Text>
                  <Text style={styles.td}>Antes</Text>
                  <Text style={styles.td}>Atual</Text>
                </View>
                {props.dobras.map((r) => (
                  <View key={r.label} style={styles.tableRow}>
                    <Text style={styles.th}>{r.label}</Text>
                    <Text style={styles.td}>{fmt(r.antes, " mm")}</Text>
                    <Text style={styles.td}>{fmt(r.atual, " mm")}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.subtitulo}>Sem dobras registradas.</Text>
            )}
          </View>
        </View>

        {/* Rodapé com assinatura */}
        <View style={styles.footer}>
          <Text style={styles.assinaturaNome}>{nutricionista.nome}</Text>
          <View style={styles.assinaturaLarguraWrap}>
            <View style={[styles.assinaturaLinha, { width: 240 }]} />
          </View>
          <Text style={styles.assinaturaCrn}>
            Nutricionista · CRN: {nutricionista.crn}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function Linha(props: {
  rotulo: string;
  valor: string;
  cor?: "verde" | "amarelo" | "vermelho";
  label?: string;
}) {
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>{props.rotulo}</Text>
      <Text style={styles.valor}>{props.valor}</Text>
      {props.cor && (
        <>
          <View style={[styles.bolinha, { backgroundColor: COR_BG[props.cor] }]} />
          <Text style={styles.textoCor}>{props.label}</Text>
        </>
      )}
    </View>
  );
}
