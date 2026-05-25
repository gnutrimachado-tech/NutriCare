"use client";

import React, { useState, useCallback } from "react";

// ==================== TYPES ====================
type Props = {
  sexoPaciente: "Masculino" | "Feminino";
  idade: number;
  pesoKg: number;
  alturaCm: number;
  percentualGordura: number;
  nomePaciente?: string;
  massaMuscularAnamnese?: number | null;
  massaMuscularAntropometria?: number | null;
};

// ==================== EXERCISE DATA (internal MET values) ====================
const exercises = [
  { n: "Aula de Ginástica", m: 4.8 },
  { n: "Balé", m: 4 },
  { n: "Basquete", m: 9 },
  { n: "Bicicleta 1", m: 4 },
  { n: "Bicicleta 2 (Vigoroso)", m: 10 },
  { n: "Bicicleta Ergométrica (100W)", m: 5.5 },
  { n: "Bicicleta Ergométrica (150W)", m: 7 },
  { n: "Bicicleta Ergométrica (200W)", m: 10.5 },
  { n: "Bicicleta Ergométrica (50W)", m: 12.5 },
  { n: "Boliche", m: 3 },
  { n: "Box Jumps", m: 12 },
  { n: "Boxe (Saco)", m: 6 },
  { n: "Boxe (Ringue)", m: 12 },
  { n: "Burpees", m: 8 },
  { n: "Caiaque", m: 5 },
  { n: "Calistenia 1 (Leve)", m: 3.5 },
  { n: "Calistenia 2 (Vigorosa)", m: 8 },
  { n: "Caminhada (Baixa)", m: 3.3 },
  { n: "Caminhada (6 km/h)", m: 5 },
  { n: "Ciclismo 1", m: 4 },
  { n: "Ciclismo 2 (18 km/h)", m: 6 },
  { n: "Ciclismo 3 (25 km/h)", m: 12 },
  { n: "Corrida (Trote)", m: 10 },
  { n: "Corrida (8 km/h)", m: 9 },
  { n: "Corrida (13-14 km/h)", m: 13.5 },
  { n: "Corrida (Obstáculos)", m: 10 },
  { n: "Corrida (17.5 km/h)", m: 18 },
  { n: "Corrida (Intervalada)", m: 6 },
  { n: "Corrida (12 km/h)", m: 12.5 },
  { n: "Dançar", m: 4.5 },
  { n: "Equitação", m: 6.5 },
  { n: "Escalada", m: 11 },
  { n: "Futebol", m: 7 },
  { n: "Futebol Americano", m: 9 },
  { n: "Golfe em Campo", m: 4.5 },
  { n: "Handebol", m: 8 },
  { n: "Hidroginástica", m: 4 },
  { n: "Jiu Jitsu (Competitivo)", m: 10 },
  { n: "Jiu Jitsu (Moderado)", m: 6 },
  { n: "Judô (Competitivo)", m: 10 },
  { n: "Judô (Moderado)", m: 6 },
  { n: "Kettlebell Swings", m: 11 },
  { n: "Musculação (Moderada)", m: 7 },
  { n: "Musculação (Intensa)", m: 9 },
  { n: "Natação (Moderada)", m: 6 },
  { n: "Natação (Intensa)", m: 10 },
  { n: "Patins In Line", m: 12 },
  { n: "Polo Aquático", m: 10 },
  { n: "Pular Corda", m: 10 },
  { n: "Pular Corda (Intenso)", m: 12 },
  { n: "Pull Ups", m: 9 },
  { n: "Rugby", m: 10 },
  { n: "Sinuca", m: 2.5 },
  { n: "Skate", m: 5 },
  { n: "Squash", m: 12 },
  { n: "Subir Escada (Correndo)", m: 15 },
  { n: "Surfe", m: 3 },
  { n: "Tarefas Domésticas", m: 2 },
  { n: "Tênis", m: 8 },
  { n: "Treino com Circuito", m: 8 },
  { n: "Vôlei", m: 6 },
  { n: "Yoga", m: 2.5 },
];

// ==================== STRATEGIES ====================
interface StrategyCalcResult {
  kcal: [number, number];
  prot?: [number, number];
  protPct?: number;
  carb?: [number, number] | string;
  carbPct?: [number, number];
  fat?: string;
  fatG?: [number, number];
}

interface Strategy {
  key: string;
  name: string;
  range: string;
  desc: string;
  mac: [number, number, number];
  calc: (peso: number) => StrategyCalcResult;
}

const strategies: Strategy[] = [
  {
    key: "normo",
    name: "NormoCalorica",
    range: "30-35 kcal/kg/dia",
    desc: "Proteínas: 1,5-1,8 g/kg\nCarboidratos: 40-50% kcal\nGorduras: Restante",
    mac: [30, 45, 25],
    calc: (p) => ({
      kcal: [30 * p, 35 * p],
      prot: [1.5 * p, 1.8 * p],
      carbPct: [40, 50],
      fat: "Restante",
    }),
  },
  {
    key: "highcarb",
    name: "High Carb + High Protein",
    range: "40-60 kcal/kg/dia",
    desc: "Proteínas: 2,5-3,0 g/kg\nCarboidratos: 60-70% kcal\nGorduras: 20%",
    mac: [25, 55, 20],
    calc: (p) => ({
      kcal: [40 * p, 60 * p],
      prot: [2.5 * p, 3.0 * p],
      carbPct: [60, 70],
      fat: "20%",
    }),
  },
  {
    key: "4040",
    name: "Dieta 40:40:20",
    range: "30-50 kcal/kg/dia",
    desc: "Proteínas: 40%\nCarboidratos: 40%\nGorduras: 20%",
    mac: [40, 40, 20],
    calc: (p) => ({
      kcal: [30 * p, 50 * p],
      protPct: 40,
      carbPct: [40, 40],
      fat: "20%",
    }),
  },
  {
    key: "3333",
    name: "Dieta 33:33:33",
    range: "30-40 kcal/kg/dia",
    desc: "Proteínas: 33%\nCarboidratos: 33%\nGorduras: 33%",
    mac: [33, 33, 34],
    calc: (p) => ({
      kcal: [30 * p, 40 * p],
      protPct: 33,
      carbPct: [33, 33],
      fat: "33%",
    }),
  },
  {
    key: "321",
    name: "Dieta 3:2:1",
    range: "Fixo g/kg",
    desc: "Carboidratos: 3 g/kg\nProteínas: 2 g/kg\nGorduras: 1 g/kg",
    mac: [33, 50, 17],
    calc: (p) => {
      const c = 3 * p;
      const pr = 2 * p;
      const f = 1 * p;
      const t = c * 4 + pr * 4 + f * 9;
      return { kcal: [t, t], prot: [pr, pr], carb: [c, c], fatG: [f, f] };
    },
  },
  {
    key: "keto",
    name: "Dieta Keto",
    range: "20-35 kcal/kg/dia",
    desc: "Proteínas: 25% das kcal\nCarboidratos: 10% kcal\nGorduras: Restante (65%)",
    mac: [25, 10, 65],
    calc: (p) => ({
      kcal: [20 * p, 35 * p],
      protPct: 25,
      carbPct: [10, 10],
      fat: "Restante (65%)",
    }),
  },
  {
    key: "hipo",
    name: "Dieta Hipocalórica",
    range: "20-25 kcal/kg/dia",
    desc: "Proteínas: 2,0 g/kg\nCarboidratos: Restante\nGorduras: 0,8 g/kg",
    mac: [35, 40, 25],
    calc: (p) => ({
      kcal: [20 * p, 25 * p],
      prot: [2 * p, 2 * p],
      carb: "Restante",
      fatG: [0.8 * p, 0.8 * p],
    }),
  },
  {
    key: "lowcarb",
    name: "Dieta Low Carb",
    range: "20-40 kcal/kg/dia",
    desc: "Proteínas: 2,5-3,0 g/kg\nCarboidratos: 1-2 g/kg\nGorduras: Restante",
    mac: [35, 15, 50],
    calc: (p) => ({
      kcal: [20 * p, 40 * p],
      prot: [2.5 * p, 3 * p],
      carb: [1 * p, 2 * p],
      fat: "Restante",
    }),
  },
];

// ==================== PROTOCOL FORMULAS ====================
interface Protocol {
  name: string;
  html: string;
  calc: (s: string, p: number, a: number, i: number, mm: number) => number;
  needsMass?: boolean;
}

const formulas: Record<string, Protocol> = {
  harris1919: {
    name: "Harris-Benedict 1919",
    html: "<code>♂ TMB = 66.473 + (13.7516 × Peso) + (5.0033 × Altura) - (6.755 × Idade)</code><br/><code>♀ TMB = 655.0955 + (9.5634 × Peso) + (1.8496 × Altura) - (4.6756 × Idade)</code>",
    calc: (s, p, a, i) =>
      s === "M"
        ? 66.473 + 13.7516 * p + 5.0033 * a - 6.755 * i
        : 655.0955 + 9.5634 * p + 1.8496 * a - 4.6756 * i,
  },
  harris1984: {
    name: "Harris-Benedict 1984 (Revisada)",
    html: "<code>♂ TMB = 88.362 + (13.397 × Peso) + (4.799 × Altura) - (5.677 × Idade)</code><br/><code>♀ TMB = 447.593 + (9.247 × Peso) + (3.098 × Altura) - (4.330 × Idade)</code>",
    calc: (s, p, a, i) =>
      s === "M"
        ? 88.362 + 13.397 * p + 4.799 * a - 5.677 * i
        : 447.593 + 9.247 * p + 3.098 * a - 4.33 * i,
  },
  mifflin: {
    name: "Mifflin-St Jeor",
    html: "<code>♂ TMB = (10 × Peso) + (6.25 × Altura) - (5 × Idade) + 5</code><br/><code>♀ TMB = (10 × Peso) + (6.25 × Altura) - (5 × Idade) - 161</code>",
    calc: (s, p, a, i) =>
      s === "M"
        ? 10 * p + 6.25 * a - 5 * i + 5
        : 10 * p + 6.25 * a - 5 * i - 161,
  },
  cunningham: {
    name: "Cunningham (Massa Magra)",
    html: '<code>TMB = 500 + (22 × Massa Magra)</code><br/><span style="color:#ef4444;font-size:10px">Requer Massa Magra</span>',
    calc: (_s, _p, _a, _i, mm) => (mm ? 500 + 22 * mm : 0),
    needsMass: true,
  },
  tinsley_massa: {
    name: "Tinsley (Massa Magra)",
    html: '<code>TMB = 25.9 × Massa Magra + 284</code><br/><span style="color:#ef4444;font-size:10px">Requer Massa Magra</span>',
    calc: (_s, _p, _a, _i, mm) => (mm ? 25.9 * mm + 284 : 0),
    needsMass: true,
  },
  tinsley_peso: {
    name: "Tinsley (Peso)",
    html: "<code>TMB = 24.8 × Peso + 10</code>",
    calc: (_s, p) => 24.8 * p + 10,
  },
  liu: {
    name: "Liu",
    html: "<code>♂ TMB = 13.88×P + 4.16×A - 3.43×I - 112.40</code><br/><code>♀ TMB = 9.74×P + 1.80×A - 4.68×I + 667.05</code>",
    calc: (s, p, a, i) =>
      s === "M"
        ? 13.88 * p + 4.16 * a - 3.43 * i - 112.4
        : 9.74 * p + 1.8 * a - 4.68 * i + 667.05,
  },
  katch: {
    name: "Katch-McArdle (Massa Magra)",
    html: '<code>TMB = 370 + (21.6 × Massa Magra)</code><br/><span style="color:#ef4444;font-size:10px">Requer Massa Magra</span>',
    calc: (_s, _p, _a, _i, mm) => (mm ? 370 + 21.6 * mm : 0),
    needsMass: true,
  },
  oxford: {
    name: "Oxford Brookes (Henry 2005)",
    html: "<code>♂ 18-30: 14.4×P + 313×A(m) + 113</code><br/><code>♀ 18-30: 10.4×P + 615×A(m) - 282</code><br/><code>♂ 30-60: 11.4×P + 541×A(m) - 137</code><br/><code>♀ 30-60: 8.18×P + 502×A(m) - 11.6</code><br/><code>♂ &gt;60: 11.4×P + 541×A(m) - 256</code><br/><code>♀ &gt;60: 8.52×P + 421×A(m) + 10.7</code>",
    calc: (s, p, a, i) => {
      const am = a / 100;
      if (s === "M") {
        if (i < 18) return 15.6 * p + 266 * am + 299;
        if (i < 30) return 14.4 * p + 313 * am + 113;
        if (i < 60) return 11.4 * p + 541 * am - 137;
        return 11.4 * p + 541 * am - 256;
      } else {
        if (i < 18) return 9.4 * p + 249 * am + 462;
        if (i < 30) return 10.4 * p + 615 * am - 282;
        if (i < 60) return 8.18 * p + 502 * am - 11.6;
        return 8.52 * p + 421 * am + 10.7;
      }
    },
  },
  fao: {
    name: "FAO/OMS-2001 (Recomendação Atual)",
    html: "<strong>Equações por faixa etária:</strong><br/><code>♂ 0-3: 60.9×P - 54 | ♀: 61×P - 51</code><br/><code>♂ 3-10: 22.7×P + 495 | ♀: 22.5×P + 499</code><br/><code>♂ 10-18: 17.5×P + 651 | ♀: 12.2×P + 746</code><br/><code>♂ 18-30: 15.3×P + 679 | ♀: 14.7×P + 496</code><br/><code>♂ 30-60: 11.6×P + 879 | ♀: 8.7×P + 829</code><br/><code>♂ &gt;60: 13.5×P + 487 | ♀: 10.5×P + 596</code>",
    calc: (s, p, _a, i) => {
      if (s === "M") {
        if (i <= 3) return 60.9 * p - 54;
        if (i <= 10) return 22.7 * p + 495;
        if (i <= 18) return 17.5 * p + 651;
        if (i <= 30) return 15.3 * p + 679;
        if (i <= 60) return 11.6 * p + 879;
        return 13.5 * p + 487;
      } else {
        if (i <= 3) return 61 * p - 51;
        if (i <= 10) return 22.5 * p + 499;
        if (i <= 18) return 12.2 * p + 746;
        if (i <= 30) return 14.7 * p + 496;
        if (i <= 60) return 8.7 * p + 829;
        return 10.5 * p + 596;
      }
    },
  },
};

// ==================== HELPERS ====================
function fmt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

// ==================== TREINO STATE ====================
interface TreinoState {
  exerciseIdx: string;
  tempo: number;
}

// ==================== COMPONENT ====================
export default function GastoCaloricoLayout({
  sexoPaciente,
  idade,
  pesoKg,
  alturaCm,
  percentualGordura,
  nomePaciente,
  massaMuscularAnamnese,
  massaMuscularAntropometria,
}: Props) {
  const sexo = sexoPaciente === "Masculino" ? "M" : "F";
  const massaMagraCalc = pesoKg - (pesoKg * percentualGordura) / 100;

  const [massaMuscularFonte, setMassaMuscularFonte] = useState<"anamnese" | "antropometria">("anamnese");

  const massaMuscularSelecionada = massaMuscularFonte === "anamnese"
    ? massaMuscularAnamnese
    : massaMuscularAntropometria;

  const [massaMagra, setMassaMagra] = useState<number | null>(
    percentualGordura > 0 ? Math.round(massaMagraCalc * 10) / 10 : null
  );
  const [protocolo, setProtocolo] = useState("harris1984");
  const [useFA, setUseFA] = useState(false);
  const [useTreino, setUseTreino] = useState(false);
  const [fatorAtividade, setFatorAtividade] = useState(1.5);
  const [selectedStrat, setSelectedStrat] = useState(0);
  const [treinos, setTreinos] = useState<TreinoState[]>([
    { exerciseIdx: "", tempo: 60 },
  ]);
  const [manualCalorie, setManualCalorie] = useState<number | null>(null);

  const tmb = formulas[protocolo].calc(
    sexo,
    pesoKg,
    alturaCm,
    idade,
    massaMagra ?? 0
  );

  const treinoKcals = treinos.map((t) => {
    if (t.exerciseIdx === "") return 0;
    const met = exercises[parseInt(t.exerciseIdx)].m;
    return (met * pesoKg * t.tempo) / 60;
  });
  const totalTreino = treinoKcals.reduce((a, b) => a + b, 0);

  let get = tmb;
  if (useFA) get = tmb * fatorAtividade;
  if (useTreino) get += totalTreino;

  const caloriaFinal = manualCalorie ?? Math.round(get);

  const computeStrat = useCallback(() => {
    const s = strategies[selectedStrat];
    return s.calc(pesoKg);
  }, [selectedStrat, pesoKg]);

  const stratResult = computeStrat();

  const addTreino = () => {
    if (treinos.length < 3) {
      setTreinos([...treinos, { exerciseIdx: "", tempo: 60 }]);
    }
  };

  const removeTreino = (idx: number) => {
    setTreinos(treinos.filter((_, i) => i !== idx));
  };

  const updateTreino = (
    idx: number,
    field: keyof TreinoState,
    value: string | number
  ) => {
    const updated = [...treinos];
    if (field === "exerciseIdx") {
      updated[idx] = { ...updated[idx], exerciseIdx: value as string };
    } else {
      updated[idx] = { ...updated[idx], tempo: value as number };
    }
    setTreinos(updated);
    setManualCalorie(null);
  };

  return (
    <div style={{ background: "#f0f4f8", minHeight: "100vh", padding: "16px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: "#1a3a5c",
            margin: 0,
          }}
        >
          Taxa Metabólica
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "white",
            padding: "6px 12px",
            borderRadius: "999px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#4fc3f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            {(nomePaciente || "P")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <strong
              style={{
                fontSize: "14px",
                color: "#1a3a5c",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {nomePaciente || "Paciente"}
            </strong>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {sexoPaciente} · {idade} anos · {pesoKg}kg · {alturaCm}cm
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards — design distinto do Plano Alimentar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px",
          marginBottom: "16px",
        }}
      >
        <div style={gcSummaryCard}>
          <div style={{ fontSize: "11px", color: "#e74c3c", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            🔥 Gasto Calórico (TMB)
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a202c" }}>
            {fmt(tmb)}
          </div>
          <div style={{ fontSize: "11px", color: "#a0aec0" }}>kcal/dia</div>
          <div style={{ height: "3px", background: "linear-gradient(90deg, #e74c3c, #ff8a80)", borderRadius: "2px", marginTop: "8px" }} />
        </div>
        <div style={gcSummaryCard}>
          <div style={{ fontSize: "11px", color: "#3498db", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            ⚡ Gasto Energético Total
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a202c" }}>
            {fmt(get)}
          </div>
          <div style={{ fontSize: "11px", color: "#a0aec0" }}>kcal/dia</div>
          <div style={{ height: "3px", background: "linear-gradient(90deg, #3498db, #90caf9)", borderRadius: "2px", marginTop: "8px" }} />
        </div>
        <div style={gcSummaryCard}>
          <div style={{ fontSize: "11px", color: "#2ecc71", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            🏋️ Gasto dos Treinos
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a202c" }}>
            {fmt(totalTreino)}
          </div>
          <div style={{ fontSize: "11px", color: "#a0aec0" }}>kcal</div>
          <div style={{ height: "3px", background: "linear-gradient(90deg, #2ecc71, #a5d6a7)", borderRadius: "2px", marginTop: "8px" }} />
        </div>
        <div style={gcSummaryCard}>
          <div style={{ fontSize: "11px", color: "#f39c12", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            📊 Fator de Atividade
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a202c" }}>
            {fatorAtividade.toFixed(2)}
          </div>
          <div style={{ fontSize: "11px", color: "#a0aec0" }}>FAF</div>
          <div style={{ height: "3px", background: "linear-gradient(90deg, #f39c12, #ffe082)", borderRadius: "2px", marginTop: "8px" }} />
        </div>
      </div>

      {/* Content Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "16px",
        }}
      >
        {/* LEFT / CENTER COLUMN */}
        <div>
          {/* Dados do Paciente */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>👤 Dados do Paciente</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "10px",
              }}
            >
              <div>
                <label style={labelStyle}>Sexo</label>
                <div style={readonlyFieldStyle}>
                  {sexoPaciente}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Idade (anos)</label>
                <div style={readonlyFieldStyle}>{idade}</div>
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <div style={readonlyFieldStyle}>{pesoKg}</div>
              </div>
              <div>
                <label style={labelStyle}>Altura (cm)</label>
                <div style={readonlyFieldStyle}>{alturaCm}</div>
              </div>
              <div>
                <label style={labelStyle}>
                  Massa Magra (kg){" "}
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: "8px",
                      padding: "1px 6px",
                      borderRadius: "999px",
                      fontWeight: 600,
                    }}
                  >
                    opcional
                  </span>
                </label>
                <input
                  type="number"
                  value={massaMagra ?? ""}
                  placeholder="Ex: 48"
                  onChange={(e) => {
                    setMassaMagra(
                      e.target.value ? Number(e.target.value) : null
                    );
                    setManualCalorie(null);
                  }}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Massa Muscular Source Selector */}
            <div style={{ marginTop: "12px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <label style={{ ...labelStyle, marginBottom: "6px" }}>
                Massa Muscular — Fonte dos Dados
              </label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={massaMuscularFonte}
                  onChange={(e) => setMassaMuscularFonte(e.target.value as "anamnese" | "antropometria")}
                  style={{
                    padding: "8px 12px",
                    border: "1.5px solid #dce3ec",
                    borderRadius: "8px",
                    fontSize: "12px",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 500,
                    minWidth: "180px",
                  }}
                >
                  <option value="anamnese">Anamnese</option>
                  <option value="antropometria">Antropometria</option>
                </select>
                <div style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                  {massaMuscularSelecionada != null
                    ? `${massaMuscularSelecionada} kg`
                    : "Sem dados"}
                </div>
              </div>
            </div>
          </div>

          {/* Componentes do Cálculo */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🧮 Componentes do Cálculo</h3>
            <p
              style={{
                fontSize: "11px",
                color: "#7b8a9e",
                marginBottom: "10px",
                marginTop: 0,
              }}
            >
              O gasto calórico pelo protocolo é sempre calculado. Selecione os
              componentes adicionais:
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  border: useFA
                    ? "2px solid #4fc3f7"
                    : "2px solid #e0e7ef",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  background: useFA ? "#e8f7fe" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="checkbox"
                  checked={useFA}
                  onChange={(e) => {
                    setUseFA(e.target.checked);
                    setManualCalorie(null);
                  }}
                  style={{ accentColor: "#4fc3f7" }}
                />
                Fator de Atividade
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  border: useTreino
                    ? "2px solid #4fc3f7"
                    : "2px solid #e0e7ef",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  background: useTreino ? "#e8f7fe" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="checkbox"
                  checked={useTreino}
                  onChange={(e) => {
                    setUseTreino(e.target.checked);
                    setManualCalorie(null);
                  }}
                  style={{ accentColor: "#4fc3f7" }}
                />
                Gasto do Treino (MET)
              </label>
            </div>
          </div>

          {/* Treinos (MET) */}
          {useTreino && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>⚡ Gasto Energético dos Treinos</h3>
              <div
                style={{
                  background:
                    "linear-gradient(to right, #1a3a5c, #2d5a8e)",
                  color: "white",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600 }}>
                  KCAL = MET × PESO (kg) × TEMPO (min) / 60
                </div>
                <div
                  style={{ fontSize: "9px", opacity: 0.8, marginTop: "2px" }}
                >
                  Estimativa de gasto calórico pelo método de METS
                </div>
              </div>

              {treinos.map((treino, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #e0e7ef",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1a3a5c",
                      }}
                    >
                      🏋️ Treino {idx + 1}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          background: "#f0fdf4",
                          color: "#15803d",
                          fontSize: "9px",
                          padding: "2px 6px",
                          borderRadius: "999px",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(treinoKcals[idx])} kcal
                      </span>
                      {idx > 0 && (
                        <button
                          onClick={() => removeTreino(idx)}
                          style={{
                            color: "#ef4444",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "0 4px",
                          }}
                          title="Remover"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Exercício</label>
                      <select
                        value={treino.exerciseIdx}
                        onChange={(e) =>
                          updateTreino(idx, "exerciseIdx", e.target.value)
                        }
                        style={inputStyle}
                      >
                        <option value="">Selecionar...</option>
                        {exercises.map((ex, i) => (
                          <option key={i} value={i}>
                            {ex.n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Tempo (min)</label>
                      <input
                        type="number"
                        value={treino.tempo}
                        min={1}
                        onChange={(e) =>
                          updateTreino(idx, "tempo", Number(e.target.value))
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "8px",
                    }}
                  >
                    <div style={metBoxStyle}>
                      <div style={metValueStyle}>
                        {treino.exerciseIdx !== ""
                          ? exercises[parseInt(treino.exerciseIdx)].m
                          : "--"}
                      </div>
                      <div style={metLabelStyle}>MET</div>
                    </div>
                    <div style={metBoxStyle}>
                      <div style={metValueStyle}>
                        {treino.exerciseIdx !== ""
                          ? fmt(treinoKcals[idx])
                          : "--"}
                      </div>
                      <div style={metLabelStyle}>Kcal</div>
                    </div>
                  </div>
                </div>
              ))}

              {treinos.length < 3 && (
                <button onClick={addTreino} style={addTreinoBtn}>
                  + Adicionar Treino
                </button>
              )}

              {/* Resumo treinos */}
              <div style={resumoTreinoStyle}>
                {treinos.map((_, idx) => (
                  <div key={idx} style={resumoRowStyle}>
                    <span style={{ color: "#7b8a9e" }}>
                      Kcal Treino {idx + 1}
                    </span>
                    <span
                      style={{ fontWeight: 600, color: "#1a3a5c" }}
                    >
                      {fmt(treinoKcals[idx])} kcal
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "8px",
                    marginTop: "4px",
                    borderTop: "2px solid #a5d6a7",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#1a3a5c",
                      fontSize: "12px",
                    }}
                  >
                    TOTAL TREINOS
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#2e7d32",
                      fontSize: "14px",
                    }}
                  >
                    {fmt(totalTreino)} kcal
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Detalhamento */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📊 Detalhamento do Cálculo</h3>
            <div style={detalhamentoBoxStyle}>
              <div style={detalhamentoRow}>
                <span style={{ color: "#7b8a9e" }}>Protocolo utilizado</span>
                <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                  {formulas[protocolo].name}
                </span>
              </div>
              <div style={detalhamentoRow}>
                <span style={{ color: "#7b8a9e" }}>Gasto Calórico (TMB)</span>
                <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                  {fmt(tmb)} kcal
                </span>
              </div>
              {useFA && (
                <div style={detalhamentoRow}>
                  <span style={{ color: "#7b8a9e" }}>
                    × Fator de Atividade
                  </span>
                  <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                    {fatorAtividade.toFixed(2)}
                  </span>
                </div>
              )}
              {useTreino && (
                <div style={detalhamentoRow}>
                  <span style={{ color: "#7b8a9e" }}>
                    + Gasto Treinos (MET)
                  </span>
                  <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                    {fmt(totalTreino)} kcal
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "8px",
                  marginTop: "4px",
                  borderTop: "2px solid #90caf9",
                }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#1a3a5c",
                    fontSize: "13px",
                  }}
                >
                  GASTO ENERGÉTICO TOTAL
                </span>
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#1976d2",
                    fontSize: "18px",
                  }}
                >
                  {fmt(get)} kcal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (3 Quadros) */}
        <div>
          {/* QUADRO 1: Protocolos */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📐 Protocolo de Gasto Calórico</h3>
            <div style={{ marginBottom: "8px" }}>
              <label style={labelStyle}>Selecione o Protocolo</label>
              <select
                value={protocolo}
                onChange={(e) => {
                  setProtocolo(e.target.value);
                  setManualCalorie(null);
                }}
                style={{ ...inputStyle, fontSize: "11px" }}
              >
                <option value="harris1919">Harris-Benedict 1919</option>
                <option value="harris1984">Harris-Benedict 1984</option>
                <option value="mifflin">Mifflin-St Jeor</option>
                <option value="cunningham">Cunningham (Massa Magra)</option>
                <option value="tinsley_massa">Tinsley (Massa Magra)</option>
                <option value="tinsley_peso">Tinsley (Peso)</option>
                <option value="liu">Liu</option>
                <option value="katch">Katch-McArdle (Massa Magra)</option>
                <option value="oxford">Oxford Brookes Basal Metabolic</option>
                <option value="fao">FAO/OMS (Recomendação Atual)</option>
              </select>
            </div>
            <div
              style={{
                background: "#f0f4f8",
                borderLeft: "3px solid #4fc3f7",
                padding: "8px 12px",
                borderRadius: "0 6px 6px 0",
                fontSize: "10px",
                color: "#4b5563",
                lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{
                __html: `<strong>${formulas[protocolo].name}</strong><br/>${formulas[protocolo].html}`,
              }}
            />
            <div style={protocoloResultStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "#7b8a9e", fontWeight: 600 }}>
                  Gasto Calórico (TMB)
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#e74c3c",
                  }}
                >
                  {fmt(tmb)} kcal
                </span>
              </div>
            </div>
          </div>

          {/* QUADRO 2: Estratégias Dietéticas */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🥗 Estratégia Dietética</h3>
            <p
              style={{
                fontSize: "10px",
                color: "#7b8a9e",
                margin: "0 0 6px 0",
              }}
            >
              Aplicada sobre o valor final da caloria
            </p>
            <ul
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {strategies.map((s, i) => (
                <li
                  key={s.key}
                  onClick={() => setSelectedStrat(i)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderBottom: "1px solid #f0f2f5",
                    cursor: "pointer",
                    fontSize: "11px",
                    transition: "background 0.2s",
                    background:
                      selectedStrat === i ? "#e8f7fe" : "transparent",
                    borderLeft:
                      selectedStrat === i
                        ? "3px solid #4fc3f7"
                        : "3px solid transparent",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                    {s.name}
                  </span>
                  <span style={{ color: "#7b8a9e", fontSize: "10px" }}>
                    {s.range}
                  </span>
                </li>
              ))}
            </ul>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "6px",
                padding: "10px",
                marginTop: "8px",
                fontSize: "11px",
                color: "#4b5563",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {strategies[selectedStrat].desc}
            </div>
            {/* Macro bar */}
            <div
              style={{
                display: "flex",
                height: "16px",
                borderRadius: "8px",
                overflow: "hidden",
                margin: "6px 0",
              }}
            >
              <div
                style={{
                  width: `${strategies[selectedStrat].mac[0]}%`,
                  background: "#3498db",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                {strategies[selectedStrat].mac[0]}% P
              </div>
              <div
                style={{
                  width: `${strategies[selectedStrat].mac[1]}%`,
                  background: "#2ecc71",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                {strategies[selectedStrat].mac[1]}% C
              </div>
              <div
                style={{
                  width: `${strategies[selectedStrat].mac[2]}%`,
                  background: "#f39c12",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                {strategies[selectedStrat].mac[2]}% G
              </div>
            </div>
            {/* Strategy calculations */}
            <div style={protocoloResultStyle}>
              <div style={detalhamentoRow}>
                <span style={{ color: "#7b8a9e" }}>Kcal/dia</span>
                <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                  {fmt(stratResult.kcal[0])} - {fmt(stratResult.kcal[1])} kcal
                </span>
              </div>
              <div style={detalhamentoRow}>
                <span style={{ color: "#7b8a9e" }}>Proteínas</span>
                <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                  {stratResult.prot
                    ? `${fmt(stratResult.prot[0])} - ${fmt(stratResult.prot[1])} g`
                    : stratResult.protPct
                      ? `${fmt((stratResult.kcal[0] * stratResult.protPct) / 100 / 4)} - ${fmt((stratResult.kcal[1] * stratResult.protPct) / 100 / 4)} g (${stratResult.protPct}%)`
                      : "--"}
                </span>
              </div>
              <div style={detalhamentoRow}>
                <span style={{ color: "#7b8a9e" }}>Carboidratos</span>
                <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                  {typeof stratResult.carb === "string"
                    ? stratResult.carb
                    : Array.isArray(stratResult.carb)
                      ? `${fmt(stratResult.carb[0])} - ${fmt(stratResult.carb[1])} g`
                      : stratResult.carbPct
                        ? `${fmt((stratResult.kcal[0] * stratResult.carbPct[0]) / 100 / 4)} - ${fmt((stratResult.kcal[1] * stratResult.carbPct[1]) / 100 / 4)} g`
                        : "--"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: "#7b8a9e" }}>Gorduras</span>
                <span style={{ fontWeight: 600, color: "#1a3a5c" }}>
                  {stratResult.fat
                    ? stratResult.fat
                    : stratResult.fatG
                      ? `${fmt(stratResult.fatG[0])} - ${fmt(stratResult.fatG[1])} g`
                      : "--"}
                </span>
              </div>
            </div>
          </div>

          {/* QUADRO 3: Fator de Atividade */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🏃 Fator de Atividade Física</h3>
            <div style={{ marginBottom: "8px" }}>
              <label style={labelStyle}>Nível de Atividade</label>
              <select
                value={fatorAtividade}
                onChange={(e) => {
                  setFatorAtividade(Number(e.target.value));
                  setManualCalorie(null);
                }}
                style={{ ...inputStyle, fontSize: "11px" }}
              >
                <option value={1.2}>Sedentário (1.0 - 1.39)</option>
                <option value={1.5}>Pouco Ativo (1.4 - 1.59)</option>
                <option value={1.725}>Ativo (1.6 - 1.89)</option>
                <option value={2.2}>Muito Ativo (1.9 - 2.5)</option>
              </select>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
                marginTop: "6px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Nível</th>
                  <th style={thStyle}>FA</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Sedentário", "1.0 - 1.39"],
                  ["Pouco Ativo", "1.4 - 1.59"],
                  ["Ativo", "1.6 - 1.89"],
                  ["Muito Ativo", "1.9 - 2.5"],
                ].map(([nivel, fa]) => (
                  <tr key={nivel}>
                    <td style={tdStyle}>{nivel}</td>
                    <td style={tdStyle}>{fa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Valor Final da Caloria */}
          <div
            style={{
              background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#1976d2",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              Caloria Final para o Plano
            </div>
            <div style={{ marginTop: "6px" }}>
              <input
                type="number"
                value={caloriaFinal}
                onChange={(e) => setManualCalorie(Number(e.target.value))}
                style={{
                  width: "120px",
                  textAlign: "center",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1565c0",
                  border: "2px dashed #90caf9",
                  borderRadius: "8px",
                  padding: "6px",
                  background: "rgba(255,255,255,0.7)",
                  outline: "none",
                }}
              />
            </div>
            <div
              style={{ fontSize: "9px", color: "#7b8a9e", marginTop: "4px" }}
            >
              kcal/dia · Editável pelo nutricionista
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const gcSummaryCard: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "14px",
  padding: "16px 18px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid #edf2f7",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  padding: "16px",
  marginBottom: "12px",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#1a3a5c",
  marginBottom: "12px",
  marginTop: 0,
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 600,
  color: "#7b8a9e",
  textTransform: "uppercase",
  marginBottom: "4px",
  letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  border: "1.5px solid #dce3ec",
  borderRadius: "8px",
  fontSize: "12px",
  background: "#fafbfd",
  outline: "none",
  boxSizing: "border-box",
};

const readonlyFieldStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "12px",
  background: "#f3f4f6",
  color: "#374151",
};

const metBoxStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: "6px",
  padding: "8px",
  textAlign: "center",
  flex: 1,
};

const metValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1a3a5c",
};

const metLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "#7b8a9e",
  textTransform: "uppercase",
};

const addTreinoBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "#2ecc71",
  color: "white",
  padding: "6px 14px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  marginTop: "4px",
};

const resumoTreinoStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f8fafc, #eef3f9)",
  borderRadius: "8px",
  padding: "12px",
  marginTop: "12px",
};

const resumoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  fontSize: "12px",
  borderBottom: "1px solid #e5eaf0",
};

const detalhamentoBoxStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
  borderRadius: "8px",
  padding: "12px",
};

const detalhamentoRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  fontSize: "12px",
  borderBottom: "1px solid #e5eaf0",
};

const protocoloResultStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f8fafc, #eef3f9)",
  borderRadius: "8px",
  padding: "12px",
  marginTop: "8px",
};

const thStyle: React.CSSProperties = {
  background: "#f0f4f8",
  color: "#1a3a5c",
  fontWeight: 600,
  padding: "4px",
  border: "1px solid #e0e7ef",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  padding: "4px",
  border: "1px solid #e0e7ef",
  textAlign: "center",
};
