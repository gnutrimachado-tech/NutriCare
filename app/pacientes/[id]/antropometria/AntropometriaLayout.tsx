"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { sincronizarAntropometria } from "../anamnese/actions";
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

const VOICE_FIELD_ALIASES: Array<{ key: DobraKey | CircKey; aliases: string[] }> = [
  { key: "tricipital", aliases: ["tricipital", "triceps", "tríceps", "dobra tricipital"] },
  { key: "peitoral", aliases: ["peitoral", "torax", "tórax"] },
  { key: "axilar_media", aliases: ["axilar media", "axilar média", "axilar", "axila media"] },
  { key: "subescapular", aliases: ["subescapular"] },
  { key: "abdomen", aliases: ["abdomen", "abdominal"] },
  { key: "supra_iliaca", aliases: ["supra iliaca", "supra-iliaca", "supra ilíaca"] },
  { key: "supra_espinhal", aliases: ["supra espinhal", "supraespinhal", "supra espinal"] },
  { key: "coxa", aliases: ["coxa"] },
  { key: "coxa_proximal", aliases: ["coxa proximal"] },
  { key: "panturrilha", aliases: ["panturrilha"] },
  { key: "biceps", aliases: ["biceps", "bíceps"] },
  { key: "pescoco", aliases: ["pescoco", "pescoço", "cervical"] },
  { key: "cintura", aliases: ["cintura"] },
  { key: "quadril", aliases: ["quadril", "gluteo", "glúteo"] },
  { key: "braco", aliases: ["braco", "braço"] },
  { key: "biceps_direito", aliases: ["biceps direito", "bíceps direito"] },
  { key: "biceps_esquerdo", aliases: ["biceps esquerdo", "bíceps esquerdo"] },
  { key: "coxa_direita", aliases: ["coxa direita"] },
  { key: "coxa_esquerda", aliases: ["coxa esquerda"] },
  { key: "panturrilha_direita", aliases: ["panturrilha direita"] },
  { key: "panturrilha_esquerda", aliases: ["panturrilha esquerda"] },
];

function normalizeSpeechText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bvirgula\b/g, ",")
    .replace(/\bponto\b/g, ".")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectVoiceFieldKey(transcript: string): DobraKey | CircKey | null {
  for (const field of VOICE_FIELD_ALIASES) {
    if (field.aliases.some((alias) => transcript.includes(alias))) return field.key;
  }
  return null;
}

function extractVoiceValue(transcript: string) {
  const match = transcript.match(/(\d+(?:[.,]\d+)?)/);
  return match ? normalizeDecimalInput(match[1]) : null;
}

function resolveVoiceDestination(args: {
  transcript: string;
  key: DobraKey | CircKey;
  value: string;
  requiredDobras: DobraKey[];
  requiredCircs: CircKey[];
}) {
  const { transcript, key, value, requiredDobras, requiredCircs } = args;
  if (/(circunferencia|circunferencias|perimetro|perimetros|cm|centimetro|centimetros)/.test(transcript)) return "circ" as const;
  if (/(dobra|dobras|prega|prega cutanea|mm|milimetro|milimetros)/.test(transcript)) return "dobra" as const;
  if (DOBRA_ONLY_KEYS.has(key)) return "dobra" as const;
  if (CIRC_ONLY_KEYS.has(key)) return "circ" as const;
  if (requiredDobras.includes(key as DobraKey) && !requiredCircs.includes(key as CircKey)) return "dobra" as const;
  if (requiredCircs.includes(key as CircKey) && !requiredDobras.includes(key as DobraKey)) return "circ" as const;
  if (!SHARED_ANTHRO_KEYS.has(key)) return "circ" as const;

  const numericValue = Number(value.replace(",", "."));
  return numericValue > 25 ? "circ" as const : "dobra" as const;
}

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
    r
