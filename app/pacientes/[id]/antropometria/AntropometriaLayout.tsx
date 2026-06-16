"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { sincronizarAntropometria } from "../anamnese/actions";

type SexoPaciente = "Masculino" | "Feminino";

type Props = {
  pacienteId: string;
  sexoPaciente: SexoPaciente;
  idade: number;
  pesoKg: number;
  alturaCm: number;
};

type DobraKey =
  | "peitoral"
  | "axilar_media"
  | "triceps"
  | "subescapular"
  | "abdomen"
  | "supra_iliaca"
  | "coxa"
  | "panturrilha"
  | "biceps"
  | "supra_espinhal"
  | "coxa_proximal";

type CircKey =
  | "pescoco"
  | "cintura"
  | "quadril"
  | "braco"
  | "coxa"
  | "abdomen";

type CalcResult = {
  bodyFatPct: number | null;
  density: number | null;
  formulaLabel: string;
};

type ProtocolDef = {
  id: string;
  label: string;
  sexo: SexoPaciente;
  requiredDobras: DobraKey[];
  requiredCircs?: CircKey[];
  needsAge?: boolean;
  needsHeight?: boolean;
  calculate: (ctx: {
    idade: number;
    pesoKg: number;
    alturaCm: number;
    dobras: Record<DobraKey, number>;
    circ: Record<CircKey, number>;
  }) => CalcResult;
};

const DOBRAS_LABELS: Record<DobraKey, string> = {
  peitoral: "Peitoral",
  axilar_media: "Axilar média",
  triceps: "Tríceps",
  subescapular: "Subescapular",
  abdomen: "Abdômen",
  supra_iliaca: "Supra ilíaca",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
  biceps: "Bíceps",
  supra_espinhal: "Supra espinhal",
  coxa_proximal: "Coxa proximal",
};

const CIRC_LABELS: Record<CircKey, string> = {
  pescoco: "Pescoço",
  cintura: "Cintura",
  quadril: "Quadril",
  braco: "Braço",
  coxa: "Coxa",
  abdomen: "Abdômen",
};

const DOBRAS_POR_SEXO: Record<SexoPaciente, DobraKey[]> = {
  Masculino: [
    "peitoral",
    "axilar_media",
    "triceps",
    "subescapular",
    "abdomen",
    "supra_iliaca",
    "coxa",
    "panturrilha",
    "biceps",
    "supra_espinhal",
  ],
  Feminino: [
    "peitoral",
    "axilar_media",
    "triceps",
    "subescapular",
    "abdomen",
    "supra_iliaca",
    "coxa",
    "panturrilha",
    "biceps",
    "supra_espinhal",
    "coxa_proximal",
  ],
};

const allDobrasInitial: Record<DobraKey, string> = {
  peitoral: "",
  axilar_media: "",
  triceps: "",
  subescapular: "",
  abdomen: "",
  supra_iliaca: "",
  coxa: "",
  panturrilha: "",
  biceps: "",
  supra_espinhal: "",
  coxa_proximal: "",
};

const allCircsInitial: Record<CircKey, string> = {
  pescoco: "",
  cintura: "",
  quadril: "",
  braco: "",
  coxa: "",
  abdomen: "",
};

function parsePtNumber(value: string) {
  if (!value) return 0;
  const normalized = value.replace(",", ".").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatPt(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return `00,0${suffix}`;
  return `${value.toFixed(1).replace(".", ",")}${suffix}`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function log10Safe(value: number) {
  return Math.log10(Math.max(value, 0.0001));
}

function siri495(density: number) {
  return 495 / density - 450;
}

function siri495x100From495(density: number) {
  return ((4.95 / density) - 4.5) * 100;
}

function bodyFatToDensitySiri(bodyFatPct: number) {
  return 495 / (bodyFatPct + 450);
}

function sumKeys<T extends string>(keys: T[], values: Record<T, number>) {
  return keys.reduce((acc, key) => acc + (values[key] || 0), 0);
}

const PROTOCOLS: ProtocolDef[] = [
  {
    id: "f-durnin-womersley-1974",
    label: "Durnin e Womersley 1974",
    sexo: "Feminino",
    requiredDobras: ["triceps", "biceps", "subescapular", "supra_iliaca"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["triceps", "biceps", "subescapular", "supra_iliaca"],
        dobras
      );
      const density = 1.1549 - 0.0678 * log10Safe(s);
      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Durnin e Womersley 1974",
      };
    },
  },
  {
    id: "f-petroski-1976",
    label: "Petroski 1976",
    sexo: "Feminino",
    requiredDobras: [
      "axilar_media",
      "supra_iliaca",
      "coxa",
      "panturrilha",
    ],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(
        ["axilar_media", "supra_iliaca", "coxa", "panturrilha"],
        dobras
      );
      const density =
        1.1954713 - 0.07513507 * log10Safe(s) - 0.00041072 * idade;
      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Petroski 1976",
      };
    },
  },
  {
    id: "f-withers-1987",
    label: "Withers et al. 1987",
    sexo: "Feminino",
    requiredDobras: [
      "triceps",
      "subescapular",
      "biceps",
      "supra_espinhal",
      "abdomen",
      "coxa",
      "panturrilha",
    ],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        [
          "triceps",
          "subescapular",
          "biceps",
          "supra_espinhal",
          "abdomen",
          "coxa",
          "panturrilha",
        ],
        dobras
      );
      const density = 1.0988 - 0.0004 * s;
      return {
        density,
        bodyFatPct: ((4.95 / density) - 4.5) * 100,
        formulaLabel: "Withers et al. 1987",
      };
    },
  },
  {
    id: "f-guedes-1985",
    label: "Guedes 1985",
    sexo: "Feminino",
    requiredDobras: ["coxa_proximal", "supra_iliaca", "subescapular"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["coxa_proximal", "supra_iliaca", "subescapular"],
        dobras
      );
      const density = 1.1665 - 0.0706 * log10Safe(s);
      return {
        density,
        bodyFatPct: (505 / density) - 462,
        formulaLabel: "Guedes 1985",
      };
    },
  },
  {
    id: "f-pollock-7d-1980",
    label: "Pollock 7 dobras 1980",
    sexo: "Feminino",
    requiredDobras: [
      "peitoral",
      "axilar_media",
      "triceps",
      "subescapular",
      "abdomen",
      "supra_iliaca",
      "coxa",
    ],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(
        [
          "peitoral",
          "axilar_media",
          "triceps",
          "subescapular",
          "abdomen",
          "supra_iliaca",
          "coxa",
        ],
        dobras
      );
      const density =
        1.097 -
        0.00046971 * s +
        0.00000056 * (s * s) -
        0.00012828 * idade;

      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Pollock 7 dobras 1980",
      };
    },
  },
  {
    id: "f-jackson-pollock-1985-4d",
    label: "Jackson e Pollock 1985 (4 dobras)",
    sexo: "Feminino",
    requiredDobras: ["abdomen", "triceps", "coxa", "supra_iliaca"],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(["abdomen", "triceps", "coxa", "supra_iliaca"], dobras);
      const bodyFatPct =
        0.29669 * s - 0.00043 * (s * s) + 0.02963 * idade + 1.4072;
      const density = bodyFatToDensitySiri(bodyFatPct);

      return {
        density,
        bodyFatPct,
        formulaLabel: "Jackson e Pollock 1985 (4 dobras)",
      };
    },
  },
  {
    id: "f-circunferencias",
    label: "Circunferências (Marinha)",
    sexo: "Feminino",
    requiredDobras: [],
    requiredCircs: ["pescoco", "cintura", "quadril"],
    needsHeight: true,
    calculate: ({ alturaCm, circ }) => {
      const density =
        -0.35004 * log10Safe(circ.cintura + circ.quadril - circ.pescoco) +
        0.221 * log10Safe(alturaCm) +
        1.29579;

      return {
        density,
        bodyFatPct: siri495x100From495(density),
        formulaLabel: "Circunferências (Marinha)",
      };
    },
  },

  {
    id: "m-pollock-7d-1978",
    label: "Pollock 7 dobras 1978",
    sexo: "Masculino",
    requiredDobras: [
      "peitoral",
      "axilar_media",
      "triceps",
      "subescapular",
      "abdomen",
      "supra_iliaca",
      "coxa",
    ],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(
        [
          "peitoral",
          "axilar_media",
          "triceps",
          "subescapular",
          "abdomen",
          "supra_iliaca",
          "coxa",
        ],
        dobras
      );
      const density =
        1.112 -
        0.00043499 * s +
        0.00000055 * (s * s) -
        0.00028826 * idade;

      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Pollock 7 dobras 1978",
      };
    },
  },
  {
    id: "m-withers-1987",
    label: "Withers et al. 1987",
    sexo: "Masculino",
    requiredDobras: [
      "triceps",
      "subescapular",
      "supra_espinhal",
      "panturrilha",
    ],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["triceps", "subescapular", "supra_espinhal", "panturrilha"],
        dobras
      );
      const density = 1.17484 - 0.07229 * log10Safe(s);
      return {
        density,
        bodyFatPct: ((5.01 / density) - 4.57) * 100,
        formulaLabel: "Withers et al. 1987",
      };
    },
  },
  {
    id: "m-guedes-1985",
    label: "Guedes 1985",
    sexo: "Masculino",
    requiredDobras: ["triceps", "supra_iliaca", "abdomen"],
    calculate: ({ dobras }) => {
      const s = sumKeys(["triceps", "supra_iliaca", "abdomen"], dobras);
      const density = 1.1714 - 0.0671 * log10Safe(s);
      return {
        density,
        bodyFatPct: (498 / density) - 453,
        formulaLabel: "Guedes 1985",
      };
    },
  },
  {
    id: "m-petroski-1995",
    label: "Petroski 1995",
    sexo: "Masculino",
    requiredDobras: ["subescapular", "triceps", "supra_iliaca", "panturrilha"],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(
        ["subescapular", "triceps", "supra_iliaca", "panturrilha"],
        dobras
      );

      const density =
        1.10726863 -
        0.00081201 * s +
        0.00000212 * (s * s) -
        0.00041761 * idade;

      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Petroski 1995",
      };
    },
  },
  {
    id: "m-durnin-womersley-1974",
    label: "Durnin e Womersley 1974",
    sexo: "Masculino",
    requiredDobras: ["triceps", "biceps", "subescapular", "supra_iliaca"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["triceps", "biceps", "subescapular", "supra_iliaca"],
        dobras
      );
      const density = 1.162 - 0.063 * log10Safe(s);

      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Durnin e Womersley 1974",
      };
    },
  },
  {
    id: "m-faulkner-1968",
    label: "Faulkner 1968",
    sexo: "Masculino",
    requiredDobras: ["triceps", "biceps", "subescapular", "supra_iliaca"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["triceps", "biceps", "subescapular", "supra_iliaca"],
        dobras
      );
      const density = 1.1549 - 0.0678 * log10Safe(s);

      return {
        density,
        bodyFatPct: siri495(density),
        formulaLabel: "Faulkner 1968",
      };
    },
  },
  {
    id: "m-circunferencias",
    label: "Circunferências (Marinha)",
    sexo: "Masculino",
    requiredDobras: [],
    requiredCircs: ["pescoco", "cintura"],
    needsHeight: true,
    calculate: ({ alturaCm, circ }) => {
      const density =
        -0.19077 * log10Safe(circ.cintura - circ.pescoco) +
        0.15456 * log10Safe(alturaCm) +
        1.0324;

      return {
        density,
        bodyFatPct: siri495x100From495(density),
        formulaLabel: "Circunferências (Marinha)",
      };
    },
  },
];

export default function AntropometriaLayout({
  pacienteId,
  sexoPaciente,
  idade,
  pesoKg,
  alturaCm,
}: Props) {
  const protocolosDisponiveis = useMemo(
    () => PROTOCOLS.filter((p) => p.sexo === sexoPaciente),
    [sexoPaciente]
  );

  const [protocolId, setProtocolId] = useState<string>(
    protocolosDisponiveis[0]?.id ?? ""
  );

  const [dobras, setDobras] =
    useState<Record<DobraKey, string>>(allDobrasInitial);

  const [circunferencias, setCircunferencias] =
    useState<Record<CircKey, string>>(allCircsInitial);

  const effectiveProtocolId = protocolosDisponiveis.some((p) => p.id === protocolId)
    ? protocolId
    : protocolosDisponiveis[0]?.id ?? "";

  const protocoloAtual = useMemo(
    () => protocolosDisponiveis.find((p) => p.id === effectiveProtocolId),
    [effectiveProtocolId, protocolosDisponiveis]
  );

  const dobrasNum = useMemo(() => {
    const out = {} as Record<DobraKey, number>;
    (Object.keys(dobras) as DobraKey[]).forEach((key) => {
      out[key] = parsePtNumber(dobras[key]);
    });
    return out;
  }, [dobras]);

  const circNum = useMemo(() => {
    const out = {} as Record<CircKey, number>;
    (Object.keys(circunferencias) as CircKey[]).forEach((key) => {
      out[key] = parsePtNumber(circunferencias[key]);
    });
    return out;
  }, [circunferencias]);

  // ==============================
  // PERSISTÊNCIA POR PACIENTE (Antropometria)
  // Mantém protocolo + dobras cutâneas + circunferências ao trocar de aba.
  // Só muda quando o nutri edita/apaga; nada é apagado automaticamente.
  // ==============================
  const antroHydratedRef = useRef(false);

  useEffect(() => {
    if (!pacienteId) {
      antroHydratedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(`nutricare:antro:${pacienteId}`);
        if (raw) {
          const s = JSON.parse(raw);
          if (typeof s.protocolId === "string") setProtocolId(s.protocolId);
          if (s.dobras && typeof s.dobras === "object") {
            setDobras((prev) => ({ ...prev, ...s.dobras }));
          }
          if (s.circunferencias && typeof s.circunferencias === "object") {
            setCircunferencias((prev) => ({ ...prev, ...s.circunferencias }));
          }
        }
      } catch {
        // ignore
      } finally {
        antroHydratedRef.current = true;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pacienteId]);

  useEffect(() => {
    if (!pacienteId || !antroHydratedRef.current) return;
    try {
      window.localStorage.setItem(
        `nutricare:antro:${pacienteId}`,
        JSON.stringify({ protocolId, dobras, circunferencias })
      );
    } catch {
      // ignore
    }
  }, [pacienteId, protocolId, dobras, circunferencias]);

  const requiredDobras = useMemo(() => protocoloAtual?.requiredDobras ?? [], [protocoloAtual]);
  const requiredCircs = useMemo(() => protocoloAtual?.requiredCircs ?? [], [protocoloAtual]);

  const canCalculate = useMemo(() => {
    if (!protocoloAtual) return false;

    const dobrasOk = requiredDobras.every((key) => dobrasNum[key] > 0);
    const circsOk = requiredCircs.every((key) => circNum[key] > 0);
    const ageOk = protocoloAtual.needsAge ? idade > 0 : true;
    const heightOk = protocoloAtual.needsHeight ? alturaCm > 0 : true;
    const weightOk = pesoKg > 0;

    return dobrasOk && circsOk && ageOk && heightOk && weightOk;
  }, [
    protocoloAtual,
    requiredDobras,
    requiredCircs,
    dobrasNum,
    circNum,
    idade,
    alturaCm,
    pesoKg,
  ]);

  const result = useMemo(() => {
    if (!protocoloAtual || !canCalculate) {
      return {
        bodyFatPct: null,
        density: null,
        massaAdiposa: null,
        massaMuscular: null,
        formulaLabel: protocoloAtual?.label ?? "",
      };
    }

    const calc = protocoloAtual.calculate({
      idade,
      pesoKg,
      alturaCm,
      dobras: dobrasNum,
      circ: circNum,
    });

    const bodyFatPct =
      calc.bodyFatPct !== null && Number.isFinite(calc.bodyFatPct)
        ? Math.max(0, calc.bodyFatPct)
        : null;

    const massaAdiposa =
      bodyFatPct !== null ? round1((pesoKg * bodyFatPct) / 100) : null;

    const massaMuscular =
      massaAdiposa !== null ? round1(pesoKg - massaAdiposa) : null;

    return {
      bodyFatPct: bodyFatPct !== null ? round1(bodyFatPct) : null,
      density: calc.density !== null ? round1(calc.density) : null,
      massaAdiposa,
      massaMuscular,
      formulaLabel: calc.formulaLabel,
    };
  }, [protocoloAtual, canCalculate, idade, pesoKg, alturaCm, dobrasNum, circNum]);

  // ==============================
  // % ÁGUA CORPORAL — Fórmula de Watson
  // Homens: TBW = 2.447 − 0.09156·idade + 0.1074·altura(cm) + 0.3362·peso(kg)
  // Mulheres: TBW = −2.097 + 0.1069·altura(cm) + 0.2466·peso(kg)
  // Exibe apenas o % de água do corpo (TBW / peso × 100).
  // ==============================
  const aguaCorporalPct = useMemo(() => {
    if (!(pesoKg > 0) || !(alturaCm > 0)) return null;
    const tbw =
      sexoPaciente === "Masculino"
        ? 2.447 - 0.09156 * idade + 0.1074 * alturaCm + 0.3362 * pesoKg
        : -2.097 + 0.1069 * alturaCm + 0.2466 * pesoKg;
    if (!Number.isFinite(tbw) || tbw <= 0) return null;
    return round1((tbw / pesoKg) * 100);
  }, [sexoPaciente, idade, alturaCm, pesoKg]);

  // ==============================
  // LINK COM A ANAMNESE
  // Salva massa muscular, % de gordura e % de água nas barras da Anamnese.
  // Regra: a Antropometria é a fonte — sempre que houver valor calculado,
  // ele corrige a barra correspondente na Anamnese (e, por consequência,
  // a massa muscular usada no Gasto Calórico).
  // ==============================
  const syncRef = useRef<() => void>(() => {});
  useEffect(() => {
    syncRef.current = () => {
      if (
        result.massaMuscular === null &&
        result.bodyFatPct === null &&
        result.massaAdiposa === null &&
        aguaCorporalPct === null
      ) {
        return;
      }
      sincronizarAntropometria(pacienteId, {
        massa_muscular: result.massaMuscular,
        percentual_gordura: result.bodyFatPct,
        massa_adiposa: result.massaAdiposa,
        agua_corporal: aguaCorporalPct,
      }).catch(() => {});
    };
  }, [result, aguaCorporalPct, pacienteId]);

  useEffect(() => {
    const timer = setTimeout(() => syncRef.current(), 1500);
    return () => clearTimeout(timer);
  }, [result, aguaCorporalPct]);

  useEffect(() => {
    const handler = () => syncRef.current();
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      syncRef.current();
    };
  }, []);

  function onChangeDobra(key: DobraKey, value: string) {
    setDobras((prev) => ({ ...prev, [key]: normalizeDecimalInput(value) }));
  }

  function onChangeCirc(key: CircKey, value: string) {
    setCircunferencias((prev) => ({
      ...prev,
      [key]: normalizeDecimalInput(value),
    }));
  }

  const protocolosSexo = DOBRAS_POR_SEXO[sexoPaciente];

  return (
    <div style={pageStyle}>
      <div style={mainCardStyle}>
        <div style={topCardStyle}>
          <div style={headerBlockStyle}>
            <div style={iconBubblePurple}>⌘</div>
            <div>
              <h2 style={titleStyle}>Protocolos</h2>
              <p style={subTitleStyle}>Selecione o protocolo a ser utilizado</p>
              <p style={tinyTextStyle}>
                Sexo do paciente: <strong>{sexoPaciente}</strong>
              </p>
            </div>
          </div>

          <div style={selectWrapStyle}>
            <select
              value={protocolId}
              onChange={(e) => setProtocolId(e.target.value)}
              style={selectStyle}
            >
              {protocolosDisponiveis.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={midGridStyle}>
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={headerBlockStyle}>
                <div style={iconBubblePurple}>✎</div>
                <div>
                  <h3 style={sectionTitleStyle}>Dobras necessárias</h3>
                  <p style={subTitleStyle}>Informe as dobras do protocolo</p>
                </div>
              </div>

              <div style={badgeStyle}>{protocoloAtual?.label ?? "-"}</div>
            </div>

            <div style={{ marginTop: 10 }}>
              {requiredDobras.length === 0 ? (
                <div style={emptyBoxStyle}>
                  Este protocolo usa circunferências e não exige dobras cutâneas.
                </div>
              ) : (
                requiredDobras.map((key, index) => (
                  <div key={key} style={listRowStyle}>
                    <div style={numberBubbleStyle}>{index + 1}</div>

                    <div style={{ flex: 1 }}>
                      <span style={fieldLabelStyle}>{DOBRAS_LABELS[key]}</span>
                    </div>

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,0"
                      value={dobras[key]}
                      onChange={(e) => onChangeDobra(key, e.target.value)}
                      style={smallInputStyle}
                    />
                  </div>
                ))
              )}
            </div>

            <div style={infoBoxStyle}>
              <div style={infoIconStyle}>i</div>
              <div>
                <div style={infoTitleStyle}>Lista automática por sexo e protocolo</div>
                <div style={infoTextStyle}>
                  O sistema mostra apenas as dobras necessárias do protocolo
                  selecionado para {sexoPaciente.toLowerCase()}.
                </div>
              </div>
            </div>

            <div style={helperListStyle}>
              <strong style={{ color: "#5b21b6" }}>
                Dobras cadastradas para {sexoPaciente.toLowerCase()}:
              </strong>
              <div style={helperTagsWrap}>
                {protocolosSexo.map((key) => (
                  <span key={key} style={miniTagStyle}>
                    {DOBRAS_LABELS[key]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={headerBlockStyle}>
                <div style={iconBubbleBlue}>◔</div>
                <div>
                  <h3 style={sectionTitleStyle}>Circunferências</h3>
                  <p style={subTitleStyle}>Informe as medidas (em cm)</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {(Object.keys(CIRC_LABELS) as CircKey[]).map((key) => {
                const required = requiredCircs.includes(key);

                return (
                  <div key={key} style={circRowStyle}>
                    <div style={circIconStyle}>{required ? "●" : "○"}</div>

                    <div style={{ flex: 1 }}>
                      <span style={fieldLabelStyle}>{CIRC_LABELS[key]}</span>
                      {required && (
                        <span style={requiredTextStyle}>Obrigatória neste protocolo</span>
                      )}
                    </div>

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,0"
                      value={circunferencias[key]}
                      onChange={(e) => onChangeCirc(key, e.target.value)}
                      style={smallInputStyle}
                    />
                  </div>
                );
              })}
            </div>

            <div style={infoBoxBlueStyle}>
              <div style={infoIconBlueStyle}>i</div>
              <div style={infoTextStyle}>
                Para protocolos por circunferência, os campos obrigatórios são
                destacados automaticamente.
              </div>
            </div>
          </div>
        </div>

        <div style={resultCardStyle}>
          <div style={resultHeaderStyle}>
            <div style={headerBlockStyle}>
              <div style={iconBubblePurple}>🏆</div>
              <div>
                <h3 style={sectionTitleStyle}>Resultados</h3>
                <p style={subTitleStyle}>
                  Resultados calculados a partir do protocolo selecionado
                </p>
              </div>
            </div>

            <div style={selectedProtocolBoxStyle}>
              <div style={selectedProtocolMiniTitle}>Protocolo selecionado</div>
              <div style={selectedProtocolValue}>
                {protocoloAtual?.label ?? "-"}
              </div>
            </div>
          </div>

          <div style={resultsGridStyle}>
            <div style={resultItemStyle}>
              <div style={resultIconGreen}>💪</div>
              <div>
                <div style={resultTitleGreen}>Massa muscular</div>
                <div style={resultValueStyle}>
                  {formatPt(result.massaMuscular, " kg")}
                </div>
                <div style={resultFootNoteStyle}>estimada</div>
              </div>
            </div>

            <div style={resultItemStyle}>
              <div style={resultIconOrange}>◉</div>
              <div>
                <div style={resultTitleOrange}>Massa adiposa</div>
                <div style={resultValueStyle}>
                  {formatPt(result.massaAdiposa, " kg")}
                </div>
              </div>
            </div>

            <div style={resultItemStyle}>
              <div style={resultIconRed}>◉</div>
              <div>
                <div style={resultTitleRed}>% de gordura</div>
                <div style={resultValueRedStyle}>
                  {formatPt(result.bodyFatPct, " %")}
                </div>
              </div>
            </div>
          </div>

          <div style={bottomMetaStyle}>
            <div style={metaPillStyle}>
              Densidade corporal: <strong>{formatPt(result.density)}</strong>
            </div>

            <div style={metaPillStyle}>
              Peso: <strong>{formatPt(pesoKg, " kg")}</strong>
            </div>

            <div style={metaPillStyle}>
              Altura: <strong>{formatPt(alturaCm, " cm")}</strong>
            </div>

            <div style={metaPillStyle}>
              Idade: <strong>{idade || 0} anos</strong>
            </div>
          </div>

          {!canCalculate && (
            <div style={warningBoxStyle}>
              Preencha peso, altura, idade e todos os campos obrigatórios do
              protocolo para liberar o cálculo.
            </div>
          )}
        </div>

        {/* ÁGUA CORPORAL + VO2 MAX — lado a lado */}
        <div style={metricPairGridStyle}>
          {/* ÁGUA CORPORAL — Fórmula de Watson */}
          <div style={{ ...resultCardStyle, ...metricPairCardStyle, margin: 0 }}>
            <div style={resultHeaderStyle}>
              <div style={headerBlockStyle}>
                <div style={iconBubbleBlue}>💧</div>
                <div>
                  <h3 style={sectionTitleStyle}>% de água corporal</h3>
                  <p style={subTitleStyle}>
                    Fórmula de Watson ({sexoPaciente})
                  </p>
                </div>
              </div>
            </div>

            <div style={vo2ResultRowStyle}>
              <div
                style={{
                  ...vo2ResultBoxStyle,
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                }}
              >
                <div style={vo2ResultLabelStyle}>% de água corporal</div>
                <div style={{ ...vo2ResultValueStyle, color: '#2563eb', fontSize: 32 }}>
                  {aguaCorporalPct !== null ? formatPt(aguaCorporalPct, " %") : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* VO2 MAX — Jack Daniels */}
          <VO2MaxJackDaniels sexoPaciente={sexoPaciente} pacienteId={pacienteId} />
        </div>
      </div>
    </div>
  );
}

// ==================== VO2 MAX — JACK DANIELS ====================
function classifyVdot(v: number): { label: string; color: string; bg: string } {
  if (v < 35) return { label: "Iniciante", color: "#dc2626", bg: "#fef2f2" };
  if (v < 45) return { label: "Recreativo treinado", color: "#d97706", bg: "#fffbeb" };
  if (v < 55) return { label: "Muito bom", color: "#16a34a", bg: "#f0fdf4" };
  if (v < 65) return { label: "Excelente", color: "#16a34a", bg: "#f0fdf4" };
  return { label: "Elite", color: "#15803d", bg: "#dcfce7" };
}

function VO2MaxJackDaniels({
  sexoPaciente,
  pacienteId,
}: {
  sexoPaciente: SexoPaciente;
  pacienteId: string;
}) {
  const [distancia, setDistancia] = useState(""); // metros
  const [tempo, setTempo] = useState(""); // minutos

  // Persiste distância/tempo por paciente (não apaga ao trocar de aba).
  const vo2HydratedRef = useRef(false);
  useEffect(() => {
    if (!pacienteId) {
      vo2HydratedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(`nutricare:antro-vo2:${pacienteId}`);
        if (raw) {
          const s = JSON.parse(raw);
          if (typeof s.distancia === "string") setDistancia(s.distancia);
          if (typeof s.tempo === "string") setTempo(s.tempo);
        }
      } catch {
        // ignore
      } finally {
        vo2HydratedRef.current = true;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pacienteId]);

  useEffect(() => {
    if (!pacienteId || !vo2HydratedRef.current) return;
    try {
      window.localStorage.setItem(
        `nutricare:antro-vo2:${pacienteId}`,
        JSON.stringify({ distancia, tempo })
      );
    } catch {
      // ignore
    }
  }, [pacienteId, distancia, tempo]);

  const dist = parsePtNumber(distancia);
  const min = parsePtNumber(tempo);

  const vo2max = useMemo(() => {
    if (!(dist > 0) || !(min > 0)) return null;
    const v = dist / min; // velocidade em metros/minuto
    const valor = -4.6 + 0.182258 * v + 0.000104 * v * v;
    if (!Number.isFinite(valor) || valor <= 0) return null;
    return Math.round(valor * 10) / 10;
  }, [dist, min]);

  const cls = vo2max !== null ? classifyVdot(vo2max) : null;

  return (
    <div style={{ ...resultCardStyle, ...metricPairCardStyle, margin: 0 }}>
      <div style={{ ...resultHeaderStyle, alignItems: 'center' }}>
        <div style={headerBlockStyle}>
          <div style={iconBubblePurple}>🏃</div>
          <div>
            <h3 style={sectionTitleStyle}>VO2max — (corredores)</h3>
            <p style={subTitleStyle}>
              Cálculo automático para {sexoPaciente.toLowerCase()}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
          <div>
            <label style={vo2LabelStyle}>Distância (metros)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 5000"
              value={distancia}
              onChange={(e) => setDistancia(normalizeDecimalInput(e.target.value))}
              style={smallInputStyle}
            />
          </div>
          <div>
            <label style={vo2LabelStyle}>Tempo (minutos)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 25"
              value={tempo}
              onChange={(e) => setTempo(normalizeDecimalInput(e.target.value))}
              style={smallInputStyle}
            />
          </div>
        </div>
      </div>

      <div style={vo2ResultRowStyle}>
        <div
          style={{
            ...vo2ResultBoxStyle,
            background: cls ? cls.bg : "#f8fafc",
          }}
        >
          <div style={vo2ResultLabelStyle}>VO2max estimado</div>
          <div style={{ ...vo2ResultValueStyle, color: cls ? cls.color : "#0f172a" }}>
            {vo2max !== null ? (
              <>
                {formatPt(vo2max)}{" "}
                <span style={{ fontSize: 12, fontWeight: 500, color: cls ? cls.color : "#64748b" }}>
                  ml/kg/min
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
          {cls && (
            <div style={{ fontSize: 13, fontWeight: 700, color: cls.color, marginTop: 2 }}>
              {cls.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeDecimalInput(value: string) {
  return value
    .replace(/[^\d.,]/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(/,(?=.*,)/g, "");
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  padding: "20px 0",
};

const mainCardStyle: React.CSSProperties = {
  background: "#fcfcff",
  border: "1px solid #efeaf8",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(76, 29, 149, 0.05)",
};

const topCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  background: "#fff",
  border: "1px solid #eee7fb",
  borderRadius: 20,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
};

const midGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 24,
  marginBottom: 24,
};

const sectionCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee7fb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
};

const resultCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee7fb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
};

const headerBlockStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const resultHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#111827",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: "#111827",
};

const subTitleStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 14,
  color: "#6b7280",
};

const tinyTextStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 12,
  color: "#8b5cf6",
};

const selectWrapStyle: React.CSSProperties = {
  minWidth: 320,
  flex: 1,
  maxWidth: 420,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  border: "1px solid #e6e8f0",
  borderRadius: 14,
  fontSize: 16,
  outline: "none",
  background: "#fff",
  color: "#111827",
};

const badgeStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "linear-gradient(135deg, #f3e8ff, #ede9fe)",
  color: "#7c3aed",
  fontWeight: 700,
  fontSize: 14,
};

const listRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 14px",
  border: "1px solid #ede9fe",
  borderRadius: 14,
  marginBottom: 12,
  background: "#fff",
};

const circRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9",
};

const numberBubbleStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#7c3aed",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 13,
  flexShrink: 0,
};

const circIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#eff6ff",
  color: "#2563eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 700,
  flexShrink: 0,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#111827",
  fontSize: 15,
  fontWeight: 600,
};

const requiredTextStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "#8b5cf6",
  fontSize: 12,
  fontWeight: 600,
};

const smallInputStyle: React.CSSProperties = {
  width: 90,
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 15,
  textAlign: "center",
  outline: "none",
};

const resultsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
  marginBottom: 18,
};

const resultItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: 20,
  border: "1px solid #eef2ff",
  borderRadius: 18,
  background: "#fff",
};

const resultValueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: "#111827",
  marginTop: 4,
};

const resultValueRedStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: "#111827",
  marginTop: 4,
};

const resultFootNoteStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#9ca3af",
};

const aguaValueBoxStyle: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #dbeafe",
  borderRadius: 14,
  padding: "12px 20px",
  textAlign: "center",
};

const aguaValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#2563eb",
};

const metricPairGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  marginTop: 24,
  alignItems: "stretch",
};

const metricPairCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: 260,
};

const metricPairSpacerStyle: React.CSSProperties = {
  minHeight: 74,
  marginTop: 16,
};

const vo2GridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  marginTop: 16,
  alignItems: "end",
  minHeight: 74,
};

const vo2LabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

const vo2ResultRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 0,
  marginTop: "auto",
};

const vo2ResultBoxStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "18px 20px",
  textAlign: "center",
  minHeight: 108,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const vo2ResultLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const vo2ResultValueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  color: "#0f172a",
  marginTop: 4,
};

const resultTitleGreen: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 800,
  fontSize: 15,
};

const resultTitleOrange: React.CSSProperties = {
  color: "#d97706",
  fontWeight: 800,
  fontSize: 15,
};

const resultTitleRed: React.CSSProperties = {
  color: "#dc2626",
  fontWeight: 800,
  fontSize: 15,
};

const bottomMetaStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 6,
};

const metaPillStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 13,
  color: "#475569",
};

const warningBoxStyle: React.CSSProperties = {
  marginTop: 16,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fdba74",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
};

const selectedProtocolBoxStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #faf5ff, #f5f3ff)",
  border: "1px solid #ede9fe",
  borderRadius: 16,
  padding: "12px 16px",
  minWidth: 220,
};

const selectedProtocolMiniTitle: React.CSSProperties = {
  fontSize: 12,
  color: "#7c3aed",
  fontWeight: 700,
  marginBottom: 4,
};

const selectedProtocolValue: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#6d28d9",
};

const emptyBoxStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: 14,
  background: "#faf5ff",
  color: "#6d28d9",
  border: "1px solid #ede9fe",
  fontWeight: 600,
};

const infoBoxStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "14px",
  borderRadius: 16,
  background: "#f5f3ff",
  marginTop: 16,
};

const infoBoxBlueStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "14px",
  borderRadius: 16,
  background: "#eff6ff",
  marginTop: 16,
};

const infoIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#7c3aed",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  flexShrink: 0,
};

const infoIconBlueStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#2563eb",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  flexShrink: 0,
};

const infoTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#5b21b6",
  marginBottom: 4,
};

const infoTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#5b6475",
  lineHeight: 1.5,
};

const helperListStyle: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 12,
  borderTop: "1px solid #f1f5f9",
};

const helperTagsWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const miniTagStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 12,
  fontWeight: 600,
};

const iconBubblePurple: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  background: "linear-gradient(135deg, #f3e8ff, #ede9fe)",
  color: "#7c3aed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 800,
  flexShrink: 0,
};

const iconBubbleBlue: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
  color: "#2563eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 800,
  flexShrink: 0,
};

const resultIconGreen: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "#ecfdf5",
  color: "#16a34a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  flexShrink: 0,
};

const resultIconOrange: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "#fffbeb",
  color: "#d97706",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  flexShrink: 0,
};

const resultIconRed: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "#fef2f2",
  color: "#dc2626",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  flexShrink: 0,
};
