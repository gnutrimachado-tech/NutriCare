"use client";

import React, { useMemo, useState } from "react";

type SexoPaciente = "Masculino" | "Feminino";

type Props = {
  sexoPaciente: SexoPaciente;
  idade: number;
  pesoKg: number;
  alturaCm: number;
  percentualGordura: number;
};

const activityFactors = [
  { label: "Sedentário", factor: 1.2 },
  { label: "Pouco ativo", factor: 1.375 },
  { label: "Ativo", factor: 1.55 },
  { label: "Muito ativo", factor: 1.725 },
];

const dietStrategies = [
  {
    id: "manutencao",
    title: "Normocalórica",
    desc: "Manutenção",
    adjust: 0,
  },
  {
    id: "hipercalorica",
    title: "Hipercalórica",
    desc: "Superávit calórico",
    adjust: 400,
  },
  {
    id: "hipocalorica",
    title: "Hipocalórica",
    desc: "Déficit calórico",
    adjust: -500,
  },
  {
    id: "lowcarb",
    title: "Low Carb",
    desc: "Baixo carboidrato",
    adjust: -250,
  },
];

export default function GastoCaloricoLayout({
  sexoPaciente,
  idade,
  pesoKg,
  alturaCm,
  percentualGordura,
}: Props) {
  const [activityFactor, setActivityFactor] = useState(1.2);

  const [strategy, setStrategy] = useState("manutencao");

  const massaMagra =
    pesoKg - (pesoKg * percentualGordura) / 100;

  const tmb = useMemo(() => {
    if (sexoPaciente === "Masculino") {
      return (
        88.362 +
        13.397 * pesoKg +
        4.799 * alturaCm -
        5.677 * idade
      );
    }

    return (
      447.593 +
      9.247 * pesoKg +
      3.098 * alturaCm -
      4.33 * idade
    );
  }, [sexoPaciente, idade, pesoKg, alturaCm]);

  const get = tmb * activityFactor;

  const selectedStrategy =
    dietStrategies.find((s) => s.id === strategy);

  const metaCalorica =
    get + (selectedStrategy?.adjust ?? 0);

  const proteinaG = round1(massaMagra * 2.2);
  const gorduraG = round1(pesoKg * 0.8);

  const kcalProteina = proteinaG * 4;
  const kcalGordura = gorduraG * 9;

  const carboG = round1(
    (metaCalorica - kcalProteina - kcalGordura) / 4
  );

  return (
    <div style={pageStyle}>
      <div style={mainCardStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>
              Cálculo Metabólico e Estratégias Dietéticas
            </h1>

            <p style={subTitleStyle}>
              Calcule gastos energéticos e defina a melhor estratégia
              nutricional do paciente.
            </p>
          </div>

          <div style={patientCardStyle}>
            <div style={avatarStyle}>👤</div>

            <div>
              <div style={patientNameStyle}>
                Paciente
              </div>

              <div style={patientInfoStyle}>
                {sexoPaciente} • {idade} anos • {pesoKg}kg
              </div>
            </div>
          </div>
        </div>

        <div style={cardsGridStyle}>
          <div style={metricCardStyle}>
            <div style={metricIconBlue}>🔥</div>

            <div>
              <div style={metricTitleBlue}>TMB</div>

              <div style={metricValueStyle}>
                {round1(tmb)} kcal
              </div>

              <div style={metricSubStyle}>
                Taxa metabólica basal
              </div>
            </div>
          </div>

          <div style={metricCardStyle}>
            <div style={metricIconGreen}>⚡</div>

            <div>
              <div style={metricTitleGreen}>GET</div>

              <div style={metricValueStyle}>
                {round1(get)} kcal
              </div>

              <div style={metricSubStyle}>
                Gasto energético total
              </div>
            </div>
          </div>

          <div style={metricCardStyle}>
            <div style={metricIconOrange}>🍚</div>

            <div>
              <div style={metricTitleOrange}>Meta Calórica</div>

              <div style={metricValueStyle}>
                {round1(metaCalorica)} kcal
              </div>

              <div style={metricSubStyle}>
                Objetivo diário
              </div>
            </div>
          </div>
        </div>

        <div style={contentGridStyle}>
          <div>
            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                Fator de atividade física
              </h3>

              <div style={{ marginTop: 20 }}>
                {activityFactors.map((item) => (
                  <label
                    key={item.label}
                    style={activityRowStyle}
                  >
                    <div style={{ display: "flex", gap: 12 }}>
                      <input
                        type="radio"
                        checked={
                          activityFactor === item.factor
                        }
                        onChange={() =>
                          setActivityFactor(item.factor)
                        }
                      />

                      <div>
                        <div style={activityTitleStyle}>
                          {item.label}
                        </div>

                        <div style={activitySubStyle}>
                          Fator {item.factor}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                Estratégia dietética
              </h3>

              <div style={strategyGridStyle}>
                {dietStrategies.map((item) => {
                  const active =
                    strategy === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setStrategy(item.id)
                      }
                      style={{
                        ...strategyCardStyle,
                        border: active
                          ? "2px solid #7c3aed"
                          : "1px solid #e5e7eb",
                        background: active
                          ? "#faf5ff"
                          : "#fff",
                      }}
                    >
                      <div style={strategyTitleStyle}>
                        {item.title}
                      </div>

                      <div style={strategyDescStyle}>
                        {item.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                Distribuição de macronutrientes
              </h3>

              <div style={macroGridStyle}>
                <div style={macroCardStyle}>
                  <div style={macroTitleBlue}>
                    Proteínas
                  </div>

                  <div style={macroValueStyle}>
                    {proteinaG} g
                  </div>

                  <div style={macroSubStyle}>
                    {round1(kcalProteina)} kcal
                  </div>
                </div>

                <div style={macroCardStyle}>
                  <div style={macroTitleOrange}>
                    Carboidratos
                  </div>

                  <div style={macroValueStyle}>
                    {carboG} g
                  </div>

                  <div style={macroSubStyle}>
                    {round1(carboG * 4)} kcal
                  </div>
                </div>

                <div style={macroCardStyle}>
                  <div style={macroTitleGreen}>
                    Gorduras
                  </div>

                  <div style={macroValueStyle}>
                    {gorduraG} g
                  </div>

                  <div style={macroSubStyle}>
                    {round1(kcalGordura)} kcal
                  </div>
                </div>
              </div>
            </div>

            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                Resumo metabólico
              </h3>

              <div style={summaryRowStyle}>
                <span>TMB</span>
                <strong>{round1(tmb)} kcal</strong>
              </div>

              <div style={summaryRowStyle}>
                <span>GET</span>
                <strong>{round1(get)} kcal</strong>
              </div>

              <div style={summaryRowStyle}>
                <span>Estratégia</span>
                <strong>
                  {selectedStrategy?.title}
                </strong>
              </div>

              <div style={summaryRowStyle}>
                <span>Meta calórica</span>
                <strong>
                  {round1(metaCalorica)} kcal
                </strong>
              </div>

              <div style={summaryRowStyle}>
                <span>Massa magra</span>
                <strong>
                  {round1(massaMagra)} kg
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  padding: "20px",
};

const mainCardStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 28,
  padding: 24,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 20,
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  color: "#111827",
};

const subTitleStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#6b7280",
  fontSize: 16,
};

const patientCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  padding: "14px 18px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  border: "1px solid #e5e7eb",
};

const avatarStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: "50%",
  background: "#ede9fe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
};

const patientNameStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  color: "#111827",
};

const patientInfoStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#6b7280",
};

const cardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: 20,
  marginBottom: 24,
};

const metricCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 22,
  padding: 24,
  display: "flex",
  alignItems: "center",
  gap: 18,
  border: "1px solid #e5e7eb",
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  color: "#111827",
};

const metricSubStyle: React.CSSProperties = {
  marginTop: 6,
  color: "#6b7280",
  fontSize: 14,
};

const metricTitleBlue: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
};

const metricTitleGreen: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 800,
};

const metricTitleOrange: React.CSSProperties = {
  color: "#d97706",
  fontWeight: 800,
};

const metricIconBlue: React.CSSProperties = {
  width: 70,
  height: 70,
  borderRadius: 20,
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
};

const metricIconGreen: React.CSSProperties = {
  width: 70,
  height: 70,
  borderRadius: 20,
  background: "#ecfdf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
};

const metricIconOrange: React.CSSProperties = {
  width: 70,
  height: 70,
  borderRadius: 20,
  background: "#fffbeb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1fr",
  gap: 24,
};

const sectionCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 22,
  padding: 24,
  border: "1px solid #e5e7eb",
  marginBottom: 24,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
};

const activityRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 0",
  borderBottom: "1px solid #f1f5f9",
  cursor: "pointer",
};

const activityTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#111827",
};

const activitySubStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#6b7280",
};

const strategyGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 14,
  marginTop: 20,
};

const strategyCardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  cursor: "pointer",
  transition: "0.2s",
};

const strategyTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
  fontSize: 16,
};

const strategyDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: "#6b7280",
  fontSize: 13,
};

const macroGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16,
  marginTop: 20,
};

const macroCardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  border: "1px solid #e5e7eb",
};

const macroValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  marginTop: 8,
  color: "#111827",
};

const macroSubStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#6b7280",
};

const macroTitleBlue: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
};

const macroTitleOrange: React.CSSProperties = {
  color: "#d97706",
  fontWeight: 800,
};

const macroTitleGreen: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 800,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 0",
  borderBottom: "1px solid #f1f5f9",
  color: "#374151",
  fontSize: 15,
};