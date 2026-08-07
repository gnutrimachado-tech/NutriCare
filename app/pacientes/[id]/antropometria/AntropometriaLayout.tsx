"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { sincronizarAntropometria } from "../anamnese/actions";
import type { AvaliacaoHistoricoSnapshot } from "@/lib/avaliacaoHistorico";
import {
  classificarAgua,
  classificarIMME,
  classificarIMG,
  calcularIMME,
  calcularIMG,
  calcularFFMI,
  FRACAO_MUSCULO_ESQUELETICO,
  type Sexo as SexoBC,
} from "@/lib/bodyComposition";

type SexoPaciente = "Masculino" | "Feminino";

type Props = {
  pacienteId: string;
  sexoPaciente: SexoPaciente;
  idade: number;
  pesoKg: number;
  alturaCm: number;
  avaliacaoAnteriorInicial?: AvaliacaoHistoricoSnapshot | null;
};

type DobraKey =
  | "peitoral"
  | "axilar_media"
  | "tricipital"
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
  | "abdomen"
  | "peitoral"
  | "axilar_media"
  | "supra_espinhal"
  | "panturrilha"
  | "biceps"
  | "biceps_direito"
  | "biceps_esquerdo"
  | "coxa_direita"
  | "coxa_esquerda"
  | "panturrilha_direita"
  | "panturrilha_esquerda";

type CalcResult = {
  bodyFatPct: number | null;
  density: number | null;
  formulaLabel: string;
};

type AvaliacaoSnapshotResumo = {
  pesoKg: number;
  bodyFatPct: number | null;
  massaMuscularKg: number | null;
  massaAdiposaKg: number | null;
  aguaPct: number | null;
  imme: number;
  img: number;
  ffmi: number;
};

type AvaliacaoSnapshot = {
  createdAt: string;
  protocolLabel: string;
  dobras: Partial<Record<DobraKey, string>>;
  circunferencias: Partial<Record<CircKey, string>>;
  resumo: AvaliacaoSnapshotResumo;
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
  tricipital: "Tricipital",
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

const VISIBLE_CIRC_FIELDS: CircKey[] = [
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
];

const DOBRAS_POR_SEXO: Record<SexoPaciente, DobraKey[]> = {
  Masculino: [
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
  ],
  Feminino: [
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
    "coxa_proximal",
  ],
};

const allDobrasInitial: Record<DobraKey, string> = {
  peitoral: "",
  axilar_media: "",
  tricipital: "",
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
  peitoral: "",
  axilar_media: "",
  supra_espinhal: "",
  panturrilha: "",
  biceps: "",
  biceps_direito: "",
  biceps_esquerdo: "",
  coxa_direita: "",
  coxa_esquerda: "",
  panturrilha_direita: "",
  panturrilha_esquerda: "",
};

const SHARED_ANTHRO_KEYS = new Set<string>([
  "coxa",
  "abdomen",
  "peitoral",
  "axilar_media",
  "supra_espinhal",
  "panturrilha",
  "biceps",
]);
const DOBRA_ONLY_KEYS = new Set<string>(["subescapular", "supra_iliaca", "coxa_proximal", "tricipital"]);
const CIRC_ONLY_KEYS = new Set<string>([
  "pescoco",
  "cintura",
  "quadril",
  "braco",
  "biceps_direito",
  "biceps_esquerdo",
  "coxa_direita",
  "coxa_esquerda",
  "panturrilha_direita",
  "panturrilha_esquerda",
]);

function filterNumericEntries<T extends string>(values: Record<T, string>) {
  const out: Partial<Record<T, string>> = {};
  (Object.keys(values) as T[]).forEach((key) => {
    if (parsePtNumber(values[key]) > 0) out[key] = normalizeDecimalInput(values[key]);
  });
  return out;
}

function parseSnapshotValues(values?: Record<string, string>) {
  const out: Record<string, number> = {};
  Object.entries(values ?? {}).forEach(([key, value]) => {
    const n = parsePtNumber(String(value ?? ""));
    if (n > 0) out[key] = n;
  });
  return out;
}

function formatMetric(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1).replace(".", ",")}${suffix}`;
}

function metricClassColor(kind: "musculo" | "gordura") {
  return kind === "musculo"
    ? { iconBg: "#ecfdf5", icon: "#16a34a", border: "#dcfce7", text: "#16a34a" }
    : { iconBg: "#fff7ed", icon: "#d97706", border: "#fed7aa", text: "#d97706" };
}

function parseSnapshot(raw: string | null): AvaliacaoSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AvaliacaoSnapshot;
  } catch {
    return null;
  }
}

function parseStorageFloat(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getSnapshotDateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

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
    requiredDobras: ["tricipital", "biceps", "subescapular", "supra_iliaca"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["tricipital", "biceps", "subescapular", "supra_iliaca"],
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
      "tricipital",
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
          "tricipital",
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
      "tricipital",
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
          "tricipital",
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
    requiredDobras: ["abdomen", "tricipital", "coxa", "supra_iliaca"],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(["abdomen", "tricipital", "coxa", "supra_iliaca"], dobras);
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
      "tricipital",
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
          "tricipital",
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
      "tricipital",
      "subescapular",
      "supra_espinhal",
      "panturrilha",
    ],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["tricipital", "subescapular", "supra_espinhal", "panturrilha"],
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
    requiredDobras: ["tricipital", "supra_iliaca", "abdomen"],
    calculate: ({ dobras }) => {
      const s = sumKeys(["tricipital", "supra_iliaca", "abdomen"], dobras);
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
    requiredDobras: ["subescapular", "tricipital", "supra_iliaca", "panturrilha"],
    needsAge: true,
    calculate: ({ dobras, idade }) => {
      const s = sumKeys(
        ["subescapular", "tricipital", "supra_iliaca", "panturrilha"],
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
    requiredDobras: ["tricipital", "biceps", "subescapular", "supra_iliaca"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["tricipital", "biceps", "subescapular", "supra_iliaca"],
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
    requiredDobras: ["tricipital", "biceps", "subescapular", "supra_iliaca"],
    calculate: ({ dobras }) => {
      const s = sumKeys(
        ["tricipital", "biceps", "subescapular", "supra_iliaca"],
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
  avaliacaoAnteriorInicial,
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

  useEffect(() => {
    setDobras((prev) => {
      const legacyValue = (prev as Record<string, string>).triceps;
      if (prev.tricipital || !legacyValue) return prev;
      const next = { ...prev, tricipital: legacyValue } as Record<string, string>;
      delete next.triceps;
      return next as Record<DobraKey, string>;
    });
  }, []);

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

  const [aguaInput, setAguaInput] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [gerando, setGerando] = useState<"" | "baixar" | "enviar" | "salvar">("");
  const [avaliacaoAnterior, setAvaliacaoAnterior] =
    useState<AvaliacaoHistoricoSnapshot | null>(avaliacaoAnteriorInicial ?? null);
  const [comparar, setComparar] = useState<boolean>(Boolean(avaliacaoAnteriorInicial));

  const ultimoSincronizadoRef = useRef<string>("");

  const resultado = useMemo<CalcResult | null>(() => {
    if (!protocoloAtual) return null;
    const reqDobras = protocoloAtual.requiredDobras;
    const reqCircs = protocoloAtual.requiredCircs ?? [];
    const faltaDobra = reqDobras.some((k) => !(dobrasNum[k] > 0));
    const faltaCirc = reqCircs.some((k) => !(circNum[k] > 0));
    if (faltaDobra || faltaCirc) return null;
    if (protocoloAtual.needsHeight && !(alturaCm > 0)) return null;
    try {
      return protocoloAtual.calculate({
        idade,
        pesoKg,
        alturaCm,
        dobras: dobrasNum,
        circ: circNum,
      });
    } catch {
      return null;
    }
  }, [protocoloAtual, dobrasNum, circNum, idade, pesoKg, alturaCm]);

  const sexoBC: SexoBC = sexoPaciente === "Feminino" ? "F" : "M";
  const bfPct = resultado?.bodyFatPct ?? null;
  const bfPctRound = bfPct !== null ? round1(bfPct) : null;
  const massaGordaKg =
    bfPct !== null && pesoKg > 0 ? round1((pesoKg * bfPct) / 100) : null;
  const massaMagraKg =
    bfPct !== null && pesoKg > 0 && massaGordaKg !== null
      ? round1(pesoKg - massaGordaKg)
      : null;
  const massaMuscularEsqueleticaKg =
    massaMagraKg !== null
      ? round1(massaMagraKg * FRACAO_MUSCULO_ESQUELETICO)
      : null;
  const imme =
    massaMuscularEsqueleticaKg !== null
      ? calcularIMME(massaMuscularEsqueleticaKg, alturaCm)
      : null;
  const img = massaGordaKg !== null ? calcularIMG(massaGordaKg, alturaCm) : null;
  const ffmi = massaMagraKg !== null ? calcularFFMI(massaMagraKg, alturaCm) : null;

  const classImme =
    imme !== null ? classificarIMME(imme, sexoBC, idade) : null;
  const classImg = img !== null ? classificarIMG(img, sexoBC, idade) : null;
  const aguaNum = parsePtNumber(aguaInput);
  const classAgua = aguaNum > 0 ? classificarAgua(aguaNum, sexoBC) : null;

  const anteriorResumo = avaliacaoAnterior?.resumo ?? null;
  const anteriorDobras = parseSnapshotValues(
    avaliacaoAnterior?.dobras as Record<string, string> | undefined
  );
  const anteriorCircs = parseSnapshotValues(
    avaliacaoAnterior?.circunferencias as Record<string, string> | undefined
  );

  // Sincroniza os resultados calculados com as barras da Anamnese.
  useEffect(() => {
    if (bfPctRound === null) return;
    const payload = {
      percentual_gordura: bfPctRound,
      massa_muscular: massaMagraKg,
      massa_adiposa: massaGordaKg,
    };
    const key = JSON.stringify(payload);
    if (key === ultimoSincronizadoRef.current) return;
    ultimoSincronizadoRef.current = key;
    sincronizarAntropometria(pacienteId, payload).catch(() => {});
  }, [bfPctRound, massaMagraKg, massaGordaKg, pacienteId]);

  function resumoAtual() {
    return {
      pesoKg: pesoKg > 0 ? pesoKg : null,
      bodyFatPct: bfPctRound,
      massaMuscularKg: massaMagraKg,
      massaAdiposaKg: massaGordaKg,
      aguaPct: aguaNum > 0 ? aguaNum : null,
      imme,
      img,
      ffmi,
      protocolLabel: protocoloAtual?.label || "",
    };
  }

  async function salvarHistorico() {
    const res = await fetch("/api/avaliacao-fisica/historico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pacienteId,
        protocolLabel: protocoloAtual?.label || "",
        currentDobras: dobrasNum,
        currentCircunferencias: circNum,
        resumo: resumoAtual(),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.erro || "Falha ao salvar a avaliação.");
    }
    return json.snapshot as AvaliacaoHistoricoSnapshot;
  }

  function payloadPdf() {
    const usarComparacao = comparar && Boolean(avaliacaoAnterior);
    return {
      pacienteId,
      sex: sexoBC,
      idade,
      alturaCm,
      pesoKg,
      bodyFatPct: bfPctRound,
      massaMuscularKg: massaMagraKg,
      massaAdiposaKg: massaGordaKg,
      aguaPct: aguaNum > 0 ? aguaNum : null,
      protocolLabel: protocoloAtual?.label || "",
      compareResults: usarComparacao,
      currentDobras: dobrasNum,
      currentCircunferencias: circNum,
      previousDobras: usarComparacao ? anteriorDobras : {},
      previousCircunferencias: usarComparacao ? anteriorCircs : {},
      previousSummary: usarComparacao
        ? {
            ...anteriorResumo,
            createdAt: avaliacaoAnterior?.createdAt ?? null,
            protocolLabel:
              avaliacaoAnterior?.protocolLabel ||
              anteriorResumo?.protocolLabel ||
              "",
          }
        : null,
    };
  }

  async function handleSalvar() {
    if (!resultado || bfPctRound === null) {
      setMensagem("Preencha as medidas do protocolo antes de salvar a avaliação.");
      return;
    }
    setGerando("salvar");
    setMensagem("");
    try {
      const snapshot = await salvarHistorico();
      setAvaliacaoAnterior(snapshot);
      setMensagem("Avaliação salva com sucesso.");
    } catch (e: any) {
      setMensagem(e?.message || "Erro ao salvar a avaliação.");
    } finally {
      setGerando("");
    }
  }

  async function chamarPdf(tipo: "download" | "enviar") {
    if (!resultado || bfPctRound === null || !protocoloAtual) {
      setMensagem("Preencha as medidas do protocolo para gerar o PDF.");
      return;
    }
    setGerando(tipo === "download" ? "baixar" : "enviar");
    setMensagem("");
    try {
      // Salva a avaliação atual antes de gerar o PDF (habilita a próxima comparação).
      const snapshot = await salvarHistorico().catch(() => null);
      if (snapshot) setAvaliacaoAnterior(snapshot);

      const res = await fetch(`/api/avaliacao-fisica/${tipo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPdf()),
      });

      if (tipo === "download") {
        if (!res.ok) throw new Error("Falha ao gerar o PDF.");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "avaliacao-fisica.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMensagem("PDF baixado com sucesso.");
      } else {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.erro || "Falha ao enviar a avaliação por e-mail.");
        }
        setMensagem("Avaliação enviada por e-mail com sucesso.");
      }
    } catch (e: any) {
      setMensagem(e?.message || "Erro ao processar a avaliação.");
    } finally {
      setGerando("");
    }
  }

  function renderCampo(
    key: DobraKey | CircKey,
    mapa: Record<string, string>,
    setMapa: (fn: (prev: any) => any) => void,
    unidade: string,
    obrigatorio: boolean
  ) {
    const rotulo =
      (DOBRAS_LABELS as Record<string, string>)[key] ||
      CIRC_LABELS[key as CircKey] ||
      key;
    return (
      <div key={key}>
        <label style={styles.label}>
          {rotulo} ({unidade})
          {obrigatorio ? <span style={styles.required}> *</span> : null}
        </label>
        <input
          style={{
            ...styles.input,
            ...(obrigatorio ? styles.inputRequired : null),
          }}
          inputMode="decimal"
          placeholder="0,0"
          value={mapa[key] ?? ""}
          onChange={(e) =>
            setMapa((prev: any) => ({ ...prev, [key]: e.target.value }))
          }
          onBlur={(e) =>
            setMapa((prev: any) => ({
              ...prev,
              [key]: normalizeDecimalInput(e.target.value),
            }))
          }
        />
      </div>
    );
  }

  function chipClassificacao(cl: { label: string; cor: string } | null) {
    if (!cl) return null;
    const cores =
      cl.cor === "verde"
        ? { bg: "#ecfdf5", border: "#bbf7d0", text: "#15803d" }
        : { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" };
    return (
      <span
        style={{
          display: "inline-block",
          marginLeft: 8,
          padding: "2px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          background: cores.bg,
          border: `1px solid ${cores.border}`,
          color: cores.text,
        }}
      >
        {cl.label}
      </span>
    );
  }

  function linhaResultado(
    label: string,
    valor: string,
    cl: { label: string; cor: string } | null = null
  ) {
    return (
      <div style={styles.resultRow} key={label}>
        <span style={styles.resultLabel}>{label}</span>
        <span style={styles.resultValue}>
          {valor}
          {chipClassificacao(cl)}
        </span>
      </div>
    );
  }

  function deltaComparacao(atual: number | null, anterior: number | null, invertido: boolean) {
    if (atual === null || anterior === null) return <span style={styles.deltaNeutro}>—</span>;
    const diff = round1(atual - anterior);
    if (Math.abs(diff) < 0.05) return <span style={styles.deltaNeutro}>=</span>;
    const positivo = diff > 0;
    // invertido = true para métricas em que subir é ruim (peso, gordura)
    const bom = invertido ? !positivo : positivo;
    return (
      <span style={bom ? styles.deltaBom : styles.deltaRuim}>
        {positivo ? "▲" : "▼"} {formatPt(Math.abs(diff))}
      </span>
    );
  }

  const dobrasDoSexo = DOBRAS_POR_SEXO[sexoPaciente];
  const reqDobras = protocoloAtual?.requiredDobras ?? [];
  const reqCircs = protocoloAtual?.requiredCircs ?? [];

  return (
    <div style={styles.wrapper}>
      {mensagem ? <div style={styles.alert}>{mensagem}</div> : null}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Protocolo de avaliação</h3>
        <div style={styles.protocolRow}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={styles.label}>Protocolo</label>
            <select
              style={styles.input}
              value={effectiveProtocolId}
              onChange={(e) => setProtocolId(e.target.value)}
            >
              {protocolosDisponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {avaliacaoAnterior ? (
          <label style={styles.compareRow}>
            <input
              type="checkbox"
              checked={comparar}
              onChange={(e) => setComparar(e.target.checked)}
            />
            <span>
              Comparar com a avaliação anterior (
              {getSnapshotDateLabel(avaliacaoAnterior.createdAt)})
            </span>
          </label>
        ) : (
          <p style={styles.hint}>
            Primeira avaliação deste paciente. Salve para habilitar a comparação
            na próxima reavaliação.
          </p>
        )}
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Dobras cutâneas (mm)</h3>
          <div style={styles.fieldGrid}>
            {dobrasDoSexo.map((key) =>
              renderCampo(
                key,
                dobras,
                setDobras,
                "mm",
                reqDobras.includes(key)
              )
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Circunferências (cm)</h3>
          <div style={styles.fieldGrid}>
            {VISIBLE_CIRC_FIELDS.map((key) =>
              renderCampo(
                key,
                circunferencias,
                setCircunferencias,
                "cm",
                reqCircs.includes(key)
              )
            )}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          Resultado {resultado ? `— ${resultado.formulaLabel}` : ""}
        </h3>
        {!resultado ? (
          <p style={styles.hint}>
            Preencha as medidas obrigatórias (*) do protocolo selecionado para
            ver o resultado.
          </p>
        ) : (
          <>
            {linhaResultado("% de Gordura corporal", formatPt(bfPctRound, "%"))}
            {linhaResultado("Massa gorda", formatMetric(massaGordaKg, " kg"))}
            {linhaResultado("Massa magra", formatMetric(massaMagraKg, " kg"))}
            {linhaResultado(
              "Massa muscular esquelética (estimada)",
              formatMetric(massaMuscularEsqueleticaKg, " kg")
            )}
            {linhaResultado("IMME", imme !== null ? `${imme.toFixed(2).replace(".", ",")} kg/m²` : "—", classImme)}
            {linhaResultado("Índice de Massa Gorda (IMG)", img !== null ? `${img.toFixed(2).replace(".", ",")} kg/m²` : "—", classImg)}
            {linhaResultado("Massa Livre de Gordura (FFMI)", ffmi !== null ? `${ffmi.toFixed(2).replace(".", ",")} kg/m²` : "—")}
            <div style={{ marginTop: 12, maxWidth: 280 }}>
              <label style={styles.label}>
                Água corporal (%){chipClassificacao(classAgua)}
              </label>
              <input
                style={styles.input}
                inputMode="decimal"
                placeholder="0,0"
                value={aguaInput}
                onChange={(e) => setAguaInput(e.target.value)}
                onBlur={(e) => setAguaInput(normalizeDecimalInput(e.target.value))}
              />
            </div>
          </>
        )}
      </div>

      {comparar && anteriorResumo ? (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            Comparação com a avaliação anterior (
            {getSnapshotDateLabel(avaliacaoAnterior?.createdAt)})
          </h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Parâmetro</th>
                <th style={styles.th}>Antes</th>
                <th style={styles.th}>Atual</th>
                <th style={styles.th}>Variação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>Peso corporal (kg)</td>
                <td style={styles.td}>{formatMetric(anteriorResumo.pesoKg ?? null)}</td>
                <td style={styles.td}>{formatMetric(pesoKg > 0 ? pesoKg : null)}</td>
                <td style={styles.td}>
                  {deltaComparacao(pesoKg > 0 ? pesoKg : null, anteriorResumo.pesoKg ?? null, true)}
                </td>
              </tr>
              <tr>
                <td style={styles.td}>% de Gordura</td>
                <td style={styles.td}>{formatMetric(anteriorResumo.bodyFatPct ?? null, "%")}</td>
                <td style={styles.td}>{formatMetric(bfPctRound, "%")}</td>
                <td style={styles.td}>
                  {deltaComparacao(bfPctRound, anteriorResumo.bodyFatPct ?? null, true)}
                </td>
              </tr>
              <tr>
                <td style={styles.td}>Massa muscular (kg)</td>
                <td style={styles.td}>{formatMetric(anteriorResumo.massaMuscularKg ?? null)}</td>
                <td style={styles.td}>{formatMetric(massaMagraKg)}</td>
                <td style={styles.td}>
                  {deltaComparacao(massaMagraKg, anteriorResumo.massaMuscularKg ?? null, false)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={styles.actions}>
        <button
          type="button"
          style={styles.btnGhost}
          disabled={gerando !== ""}
          onClick={handleSalvar}
        >
          {gerando === "salvar" ? "Salvando..." : "Salvar avaliação"}
        </button>
        <button
          type="button"
          style={styles.btnPrimary}
          disabled={gerando !== ""}
          onClick={() => chamarPdf("download")}
        >
          {gerando === "baixar" ? "Gerando PDF..." : "Baixar PDF"}
        </button>
        <button
          type="button"
          style={styles.btnSecondary}
          disabled={gerando !== ""}
          onClick={() => chamarPdf("enviar")}
        >
          {gerando === "enviar" ? "Enviando..." : "Enviar por e-mail"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 16, marginTop: 16 },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: 20,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  },
  cardTitle: { margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#0f172a" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    boxSizing: "border-box",
  },
  inputRequired: { borderColor: "#16a34a", background: "#f0fdf4" },
  required: { color: "#16a34a" },
  protocolRow: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" },
  compareRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    fontSize: 14,
    color: "#334155",
    cursor: "pointer",
  },
  hint: { margin: "8px 0 0", fontSize: 13, color: "#64748b" },
  alert: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
    flexWrap: "wrap",
  },
  resultLabel: { fontSize: 14, color: "#475569" },
  resultValue: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "2px solid #e2e8f0",
    color: "#475569",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  td: { padding: "8px 6px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" },
  deltaBom: { color: "#15803d", fontWeight: 700 },
  deltaRuim: { color: "#b91c1c", fontWeight: 700 },
  deltaNeutro: { color: "#94a3b8", fontWeight: 700 },
  actions: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" },
  btnPrimary: {
    padding: "10px 18px",
    borderRadius: 12,
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  btnSecondary: {
    padding: "10px 18px",
    borderRadius: 12,
    border: "none",
    background: "#0f766e",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  btnGhost: {
    padding: "10px 18px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
};

function normalizeDecimalInput(value: string) {
  const limpo = String(value || "")
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, ",")
    .replace(/,+/g, ",");
  if (!limpo) return "";
  const partes = limpo.split(",");
  if (partes.length === 1) return partes[0];
  return `${partes[0]},${partes.slice(1).join("")}`;
}
