"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { sincronizarAntropometria } from "../anamnese/actions";
import type { AvaliacaoHistoricoSnapshot } from "@/lib/avaliacaoHistorico";
import {
  classificarAgua,
  classificarIMME,
  classificarIMG,
  classificarFFMI,
  classificarPercentualGordura,
  calcularIMME,
  calcularIMG,
  calcularFFMI,
  FRACAO_MUSCULO_ESQUELETICO,
  type Sexo as SexoBC,
} from "@/lib/bodyComposition";

type SexoPaciente = "Masculino" | "Feminino";

type HistoricoItem = {
  id: string;
  createdAt: string | null;
  snapshot: AvaliacaoHistoricoSnapshot | null;
};

type Props = {
  pacienteId: string;
  sexoPaciente: SexoPaciente;
  idade: number;
  pesoKg: number;
  alturaCm: number;
  avaliacaoAnteriorInicial?: AvaliacaoHistoricoSnapshot | null;
  historicoAvaliacoes?: HistoricoItem[];
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

function parseSnapshot(raw: string | null): AvaliacaoHistoricoSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AvaliacaoHistoricoSnapshot;
  } catch {
    return null;
  }
}

function parseStorageFloat(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function speakVoiceConfirmation(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1.05;
    const voices = synth.getVoices?.() ?? [];
    const preferred = voices.find((voice) => /pt[-_]BR/i.test(voice.lang) && /(female|luciana|francisca|helena|microsoft maria|google português do brasil)/i.test(`${voice.name}`))
      || voices.find((voice) => /pt[-_]BR/i.test(voice.lang))
      || voices[0];
    if (preferred) utterance.voice = preferred;
    synth.speak(utterance);
  } catch {
    // ignore
  }
}

function readStoredVO2max(pacienteId: string) {
  if (typeof window === "undefined" || !pacienteId) return null;
  try {
    const raw = window.localStorage.getItem(`nutricare:antro-vo2:${pacienteId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const distancia = Number(String(data?.distancia ?? "").replace(",", "."));
    const tempo = Number(String(data?.tempo ?? "").replace(",", "."));
    if (!(distancia > 0) || !(tempo > 0)) return null;
    const v = distancia / tempo;
    const valor = -4.6 + 0.182258 * v + 0.000104 * v * v;
    if (!Number.isFinite(valor) || valor <= 0) return null;
    return Math.round(valor * 10) / 10;
  } catch {
    return null;
  }
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
  avaliacaoAnteriorInicial = null,
  historicoAvaliacoes = [],
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

  // ==============================
  // PERSISTÊNCIA POR PACIENTE (Antropometria)
  // Mantém protocolo + dobras cutâneas + circunferências ao trocar de aba.
  // Só muda quando o nutri edita/apaga; nada é apagado automaticamente.
  // ==============================
  const antroHydratedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const voiceKeepAliveRef = useRef(false);
  const voiceFlashTimerRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(
    "Clique para ativar o registro de voz e diga algo como: dobra tricipital 12 ou circunferência cintura 85."
  );
  const [lastVoiceEntry, setLastVoiceEntry] = useState("");
  const [highlightedVoiceField, setHighlightedVoiceField] = useState<string | null>(null);
  const [compararResultados, setCompararResultados] = useState(false);
  const [avaliacaoAnterior, setAvaliacaoAnterior] =
    useState<AvaliacaoHistoricoSnapshot | null>(avaliacaoAnteriorInicial);

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
            const dobrasSalvas = { ...(s.dobras as Record<string, string>) };
            if (!dobrasSalvas.tricipital && dobrasSalvas.triceps) {
              dobrasSalvas.tricipital = dobrasSalvas.triceps;
            }
            delete dobrasSalvas.triceps;
            setDobras((prev) => ({ ...prev, ...(dobrasSalvas as Partial<Record<DobraKey, string>>) }));
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
        JSON.stringify({ protocolId, dobras: { ...dobras, tricipital: dobras.tricipital }, circunferencias })
      );
    } catch {
      // ignore
    }
  }, [pacienteId, protocolId, dobras, circunferencias]);

  useEffect(() => {
    if (avaliacaoAnteriorInicial) {
      setAvaliacaoAnterior(avaliacaoAnteriorInicial);
      return;
    }
    if (!pacienteId) return;
    const snapshot = parseSnapshot(window.localStorage.getItem(`nutricare:avaliacao-snapshot:${pacienteId}`));
    setAvaliacaoAnterior(snapshot);
  }, [pacienteId, avaliacaoAnteriorInicial]);

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

  function flashVoiceField(fieldKey: string) {
    setHighlightedVoiceField(fieldKey);
    if (voiceFlashTimerRef.current) window.clearTimeout(voiceFlashTimerRef.current);
    voiceFlashTimerRef.current = window.setTimeout(() => setHighlightedVoiceField(null), 5000);
  }

  function onChangeDobra(key: DobraKey, value: string, options?: { flash?: boolean }) {
    setDobras((prev) => ({ ...prev, [key]: normalizeDecimalInput(value) }));
    if (options?.flash) flashVoiceField(`dobra:${key}`);
  }

  function onChangeCirc(key: CircKey, value: string, options?: { flash?: boolean }) {
    setCircunferencias((prev) => ({
      ...prev,
      [key]: normalizeDecimalInput(value),
    }));
    if (options?.flash) flashVoiceField(`circ:${key}`);
  }

    // =================== IMME / IMG / FFMI / % de agua ===================
  const sexoCodigo: SexoBC = sexoPaciente === "Feminino" ? "F" : "M";
  const massaMuscularEsqueleticaKg =
    result.massaMuscular !== null
      ? Math.max(0, result.massaMuscular * FRACAO_MUSCULO_ESQUELETICO)
      : null;
  const immeVal: number =
    massaMuscularEsqueleticaKg !== null && alturaCm > 0
      ? calcularIMME(massaMuscularEsqueleticaKg, alturaCm) : 0;
  const imgVal: number =
    result.massaAdiposa !== null && alturaCm > 0
      ? calcularIMG(result.massaAdiposa, alturaCm) : 0;
  const ffmiVal: number =
    result.massaMuscular !== null && alturaCm > 0
      ? calcularFFMI(result.massaMuscular, alturaCm) : 0;
  const immeClass = immeVal > 0 ? classificarIMME(immeVal, sexoCodigo, idade) : null;
  const imgClass  = imgVal  > 0 ? classificarIMG(imgVal,  sexoCodigo, idade) : null;
  const ffmiClass = ffmiVal > 0 ? classificarFFMI(ffmiVal, sexoCodigo) : null;
  const gorduraClass = result.bodyFatPct !== null ? classificarPercentualGordura(result.bodyFatPct, sexoCodigo) : null;
  const aguaClass =
    aguaCorporalPct !== null ? classificarAgua(aguaCorporalPct, sexoCodigo) : null;
  const vo2maxAtual = pacienteId ? readStoredVO2max(pacienteId) : null;

  // =================== AVALIAÇÃO FÍSICA ====================
  const [avaliacaoMsg, setAvaliacaoMsg] = useState<string | null>(null);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [baixandoAvaliacao, setBaixandoAvaliacao] = useState(false);

  // Seletor 1ª / 2ª / 3ª avaliação (para comparar)
  const historicoOrdenado = useMemo(() => {
    const arr = [...(historicoAvaliacoes || [])].filter((h) => h?.snapshot);
    arr.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    return arr;
  }, [historicoAvaliacoes]);
  const [avaliacaoBaseId, setAvaliacaoBaseId] = useState<string>("");
  useEffect(() => {
    // Padrão: comparar contra a 1ª avaliação (mais antiga), se existir.
    if (!avaliacaoBaseId && historicoOrdenado[0]?.id) {
      setAvaliacaoBaseId(historicoOrdenado[0].id);
    }
  }, [historicoOrdenado, avaliacaoBaseId]);

  function classifPill(c: { cor: "verde" | "amarelo" }) {
    return {
      ...avaliacaoPillBaseStyle,
      backgroundColor: c.cor === "verde" ? "#ecfdf5" : "#fff7ed",
      color: c.cor === "verde" ? "#16a34a" : "#d97706",
      alignSelf: "flex-start", marginTop: 4,
    } as React.CSSProperties;
  }

  function stopVoiceRecognition() {
    voiceKeepAliveRef.current = false;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setIsListening(false);
    setVoiceStatus("Registro por voz desativado.");
  }

  function handleVoiceCapture() {
    if (typeof window === "undefined") return;

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };

    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceStatus("Seu navegador não suporta captura por voz. Use Chrome ou Edge.");
      return;
    }

    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    voiceKeepAliveRef.current = true;

    const startRecognition = () => {
      if (!voiceKeepAliveRef.current) return;
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Registro por voz ativo. Diga algo como “axilar média 45” ou “circunferência cintura 85”.');
      };

      recognition.onerror = (event: { error?: string }) => {
        if (event?.error === "aborted") return;
        const message =
          event?.error === "not-allowed"
            ? "Permissão do microfone negada pelo navegador."
            : "Não consegui entender a fala. Aguardo o próximo registro.";
        setVoiceStatus(message);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (!voiceKeepAliveRef.current) {
          setIsListening(false);
          return;
        }
        window.setTimeout(() => startRecognition(), 180);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results ?? [])
          .flatMap((result: any) => Array.from(result ?? []))
          .map((item: any) => item?.transcript ?? "")
          .join(" ")
          .trim();

        setLastVoiceEntry(transcript);

        if (!transcript) {
          setVoiceStatus("Não recebi nenhum comando de voz.");
          return;
        }

        const normalizedTranscript = normalizeSpeechText(transcript);
        const key = detectVoiceFieldKey(normalizedTranscript);
        const value = extractVoiceValue(normalizedTranscript);

        if (!key || !value) {
          setVoiceStatus(`Não consegui identificar o campo e o valor em: “${transcript}”.`);
          return;
        }

        const destination = resolveVoiceDestination({
          transcript: normalizedTranscript,
          key,
          value,
          requiredDobras,
          requiredCircs,
        });

        if (destination === "dobra") {
          const label = DOBRAS_LABELS[key as DobraKey];
          onChangeDobra(key as DobraKey, value, { flash: true });
          setVoiceStatus(`Dobra ${label} ${value} registrada. Aguardando o próximo registro.`);
          speakVoiceConfirmation(`${label} ${value} registrado. Aguardo o próximo registro.`);
          return;
        }

        const label = CIRC_LABELS[key as CircKey];
        onChangeCirc(key as CircKey, value, { flash: true });
        setVoiceStatus(`Circunferência ${label} ${value} registrada. Aguardando o próximo registro.`);
        speakVoiceConfirmation(`${label} ${value} registrado. Aguardo o próximo registro.`);
      };

      recognition.start();
    };

    startRecognition();
  }

  const currentDobras = useMemo(() => filterNumericEntries(dobras), [dobras]);
  const currentCircunferencias = useMemo(() => filterNumericEntries(circunferencias), [circunferencias]);

  const previousDobras = useMemo(() => parseSnapshotValues(avaliacaoAnterior?.dobras as Record<string, string> | undefined), [avaliacaoAnterior]);
  const previousCircunferencias = useMemo(() => parseSnapshotValues(avaliacaoAnterior?.circunferencias as Record<string, string> | undefined), [avaliacaoAnterior]);

  function buildCurrentSnapshot(): AvaliacaoHistoricoSnapshot {
    return {
      createdAt: new Date().toISOString(),
      protocolLabel: protocoloAtual?.label ?? "",
      dobras: currentDobras,
      circunferencias: currentCircunferencias,
      resumo: {
        pesoKg,
        bodyFatPct: result.bodyFatPct,
        massaMuscularKg: result.massaMuscular,
        massaAdiposaKg: result.massaAdiposa,
        aguaPct: aguaCorporalPct,
        imme: immeVal,
        img: imgVal,
        ffmi: ffmiVal,
      },
    };
  }

  function persistAvaliacaoSnapshot() {
    if (!pacienteId || typeof window === "undefined") return;
    try {
      const snapshot = buildCurrentSnapshot();
      window.localStorage.setItem(`nutricare:avaliacao-snapshot:${pacienteId}`, JSON.stringify(snapshot));
      setAvaliacaoAnterior(snapshot);
    } catch {
      // ignore
    }
  }

  function createAvaliacaoPayload() {
    const snapshot = buildCurrentSnapshot();
    return {
      pacienteId,
      sex: sexoCodigo,
      idade,
      alturaCm,
      pesoKg,
      bodyFatPct: result.bodyFatPct,
      massaMuscularKg: result.massaMuscular,
      massaAdiposaKg: result.massaAdiposa,
      aguaPct: aguaCorporalPct,
      protocolLabel: protocoloAtual?.label ?? "",
      vo2max: vo2maxAtual,
      compareResults: compararResultados,
      currentDobras: Object.fromEntries(
        Object.entries(snapshot.dobras).map(([key, value]) => [key, parsePtNumber(String(value ?? ""))])
      ),
      currentCircunferencias: Object.fromEntries(
        Object.entries(snapshot.circunferencias).map(([key, value]) => [key, parsePtNumber(String(value ?? ""))])
      ),
      previousDobras: compararResultados ? previousDobras : {},
      previousCircunferencias: compararResultados ? previousCircunferencias : {},
      previousSummary: compararResultados && avaliacaoAnterior
        ? {
            pesoKg: parseStorageFloat(avaliacaoAnterior.resumo?.pesoKg),
            bodyFatPct: parseStorageFloat(avaliacaoAnterior.resumo?.bodyFatPct),
            massaMuscularKg: parseStorageFloat(avaliacaoAnterior.resumo?.massaMuscularKg),
            massaAdiposaKg: parseStorageFloat(avaliacaoAnterior.resumo?.massaAdiposaKg),
            aguaPct: parseStorageFloat(avaliacaoAnterior.resumo?.aguaPct),
            imme: parseStorageFloat(avaliacaoAnterior.resumo?.imme),
            img: parseStorageFloat(avaliacaoAnterior.resumo?.img),
            ffmi: parseStorageFloat(avaliacaoAnterior.resumo?.ffmi),
            createdAt: avaliacaoAnterior.createdAt,
            protocolLabel: avaliacaoAnterior.protocolLabel,
          }
        : null,
    };
  }

  // Ações da Avaliação Física
  async function handleEnviarAvaliacao() {
    if (!pacienteId || enviandoAvaliacao) return;
    if (result.bodyFatPct === null) {
      setAvaliacaoMsg("Preencha e calcule antes de enviar.");
      return;
    }
    try {
      setEnviandoAvaliacao(true);
      setAvaliacaoMsg("Enviando avaliação...");
      const resp = await fetch("/api/avaliacao-fisica/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createAvaliacaoPayload()),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json?.ok === false) {
        setAvaliacaoMsg(json?.erro || "Não foi possível enviar a avaliação.");
      } else {
        setAvaliacaoMsg(`Avaliação enviada para ${json?.destino || "o paciente"}.`);
      }
    } catch (e: any) {
      setAvaliacaoMsg(e?.message || "Erro ao enviar avaliação.");
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  async function handleDownloadAvaliacao() {
    if (!pacienteId || baixandoAvaliacao) return;
    if (result.bodyFatPct === null) {
      setAvaliacaoMsg("Preencha e calcule antes de baixar.");
      return;
    }
    try {
      setBaixandoAvaliacao(true);
      setAvaliacaoMsg("Gerando PDF...");
      const resp = await fetch("/api/avaliacao-fisica/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createAvaliacaoPayload()),
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        setAvaliacaoMsg(json?.erro || "Não foi possível gerar o PDF.");
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `avaliacao-fisica.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // Persiste snapshot local (histórico do lado do front) — o backend também
      // gravou no banco (rotação 1ª/2ª/3ª).
      persistAvaliacaoSnapshot();
      setAvaliacaoMsg("PDF gerado e histórico atualizado.");
    } catch (e: any) {
      setAvaliacaoMsg(e?.message || "Erro ao gerar PDF.");
    } finally {
      setBaixandoAvaliacao(false);
    }
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

          <div style={voiceActionWrapStyle}>
            <button
              type="button"
              onClick={handleVoiceCapture}
              style={{
                ...voiceButtonStyle,
                ...(isListening ? voiceButtonActiveStyle : {}),
              }}
            >
              <span style={voiceButtonIconStyle}>{isListening ? "◉" : "🎤"}</span>
              <span>Registro por voz</span>
            </button>
            <div style={voiceHelpStyle}>{voiceStatus}</div>
            {lastVoiceEntry && (
              <div style={voiceTranscriptStyle}>Último comando: “{lastVoiceEntry}”</div>
            )}
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
                      style={{ ...smallInputStyle, ...(highlightedVoiceField === `dobra:${key}` ? voiceFieldFlashStyle : {}) }}
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
              {VISIBLE_CIRC_FIELDS.map((key) => {
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
                      style={{ ...smallInputStyle, ...(highlightedVoiceField === `circ:${key}` ? voiceFieldFlashStyle : {}) }}
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
            <div style={{ ...resultItemStyle, border: "1px solid #dcfce7" }}>
              <div style={resultIconGreen}>💪</div>
              <div>
                <div style={resultTitleGreen}>Massa muscular</div>
                <div style={resultValueStyle}>
                  {formatPt(result.massaMuscular, " kg")}
                </div>
                <div style={resultFootNoteStyle}>estimada</div>
              </div>
            </div>

            <div style={{ ...resultItemStyle, border: "1px solid #fed7aa" }}>
              <div style={resultIconOrange}>🟠</div>
              <div>
                <div style={resultTitleOrange}>Massa adiposa</div>
                <div style={resultValueStyle}>
                  {formatPt(result.massaAdiposa, " kg")}
                </div>
              </div>
            </div>

            <div style={{ ...resultItemStyle, border: "1px solid #fed7aa" }}>
              <div style={resultIconOrange}>🔥</div>
              <div>
                <div style={resultTitleRed}>% de Gordura</div>
                <div style={resultValueRedStyle}>
                  {formatPt(result.bodyFatPct, " %")}
                </div>
              </div>
            </div>
          </div>

          {!canCalculate && (
            <div style={warningBoxStyle}>
              Preencha peso, altura, idade e todos os campos obrigatórios do
              protocolo para liberar o cálculo.
            </div>
          )}
        </div>
        {immeClass && imgClass ? (
          <div style={avaliacaoExtrasCardStyle}>
            <div style={headerBlockStyle}>
              <div style={iconBubblePurple}>🏆</div>
              <div>
                <h3 style={avaliacaoExtrasTitleStyle}>Resultados</h3>
                <p style={avaliacaoExtrasSubtitleStyle}>
                  Resultados calculados a partir do protocolo selecionado
                </p>
              </div>
            </div>

            <div style={resultsGridStyle}>
              <div style={{ ...resultItemStyle, border: "1px solid #dcfce7" }}>
                <div style={{ ...resultIconGreen, background: metricClassColor("musculo").iconBg, color: metricClassColor("musculo").icon }}>🏋️</div>
                <div>
                  <div style={{ ...resultTitleGreen, color: metricClassColor("musculo").text }}>Músculo Esquelético</div>
                  <div style={resultValueStyle}>{formatPt(immeVal, " kg/m²")}</div>
                </div>
              </div>

              <div style={{ ...resultItemStyle, border: "1px solid #fed7aa" }}>
                <div style={{ ...resultIconOrange, background: metricClassColor("gordura").iconBg, color: metricClassColor("gordura").icon }}>📏</div>
                <div>
                  <div style={{ ...resultTitleOrange, color: metricClassColor("gordura").text }}>Índice de Massa Gorda</div>
                  <div style={resultValueStyle}>{formatPt(imgVal, " kg/m²")}</div>
                </div>
              </div>

              <div style={{ ...resultItemStyle, border: "1px solid #dcfce7" }}>
                <div style={{ ...resultIconGreen, background: metricClassColor("musculo").iconBg, color: metricClassColor("musculo").icon }}>🧩</div>
                <div>
                  <div style={{ ...resultTitleGreen, color: metricClassColor("musculo").text }}>Massa Livre de Gordura</div>
                  <div style={resultValueStyle}>{formatPt(ffmiVal, " kg/m²")}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ÁGUA CORPORAL + VO2 MAX — lado a lado */}
        <div style={metricPairGridStyle}>
          <div style={{ ...resultCardStyle, ...metricPairCardStyle, margin: 0 }}>
            <div style={resultHeaderStyle}>
              <div style={headerBlockStyle}>
                <div style={iconBubbleBlue}>💧</div>
                <div>
                  <h3 style={sectionTitleStyle}>% de Água corporal</h3>
                  <p style={subTitleStyle}>Classificação automática por sexo</p>
                </div>
              </div>
            </div>

            <div style={vo2ResultRowStyle}>
              <div style={{ ...vo2ResultBoxStyle, background: "#eff6ff", border: "1px solid #dbeafe" }}>
                <div style={vo2ResultLabelStyle}>% de Água corporal</div>
                <div style={{ ...vo2ResultValueStyle, color: "#2563eb", fontSize: 32 }}>
                  {aguaCorporalPct !== null ? formatPt(aguaCorporalPct, " %") : "—"}
                </div>
                <div style={{ ...compareHintStyle, marginTop: 8 }}>
                  {aguaClass ? `Resultado: ${aguaClass.label}` : "Resultado indisponível"}
                </div>
              </div>
            </div>
          </div>

          <VO2MaxJackDaniels sexoPaciente={sexoPaciente} pacienteId={pacienteId} />
        </div>

        {/* ============ AVALIAÇÃO FÍSICA — Botões + Comparação ============ */}
        <div style={avaliacaoActionsCardStyle}>
          <div style={avaliacaoActionsRowStyle}>
            <button
              type="button"
              onClick={handleEnviarAvaliacao}
              disabled={enviandoAvaliacao || result.bodyFatPct === null}
              style={{
                ...avaliacaoActionBtnPrimary,
                ...(enviandoAvaliacao || result.bodyFatPct === null ? avaliacaoActionBtnDisabled : {}),
              }}
            >
              {enviandoAvaliacao ? "Enviando..." : "Enviar avaliação física"}
            </button>

            <button
              type="button"
              onClick={handleDownloadAvaliacao}
              disabled={baixandoAvaliacao || result.bodyFatPct === null}
              style={{
                ...avaliacaoActionBtnSecondary,
                ...(baixandoAvaliacao || result.bodyFatPct === null ? avaliacaoActionBtnDisabled : {}),
              }}
            >
              {baixandoAvaliacao ? "Gerando..." : "Download do PDF"}
            </button>
          </div>

          <div style={avaliacaoCompareRowStyle}>
            <label style={avaliacaoCompareToggleStyle}>
              <input
                type="checkbox"
                checked={compararResultados}
                onChange={(e) => setCompararResultados(e.target.checked)}
              />
              <span>Comparação de resultados</span>
            </label>

            {compararResultados ? (
              <div style={avaliacaoCompareSelectWrapStyle}>
                <span style={compareHintStyle}>Comparar com:</span>
                <select
                  value={avaliacaoBaseId}
                  onChange={(e) => setAvaliacaoBaseId(e.target.value)}
                  style={avaliacaoCompareSelectStyle}
                >
                  {historicoOrdenado.length === 0 ? (
                    <option value="">Sem avaliações anteriores</option>
                  ) : (
                    historicoOrdenado.map((h, idx) => {
                      const label =
                        idx === 0
                          ? "1ª avaliação"
                          : idx === 1
                          ? "2ª avaliação"
                          : "3ª avaliação";
                      const d = h.createdAt ? new Date(h.createdAt).toLocaleDateString("pt-BR") : "—";
                      return (
                        <option key={h.id} value={h.id}>
                          {label} — {d}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            ) : null}
          </div>

          {avaliacaoMsg ? <div style={avaliacaoFeedbackBoxStyle}>{avaliacaoMsg}</div> : null}
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

// ==================== AVALIAÇÃO: ESTILOS DOS BOTÕES ====================
const avaliacaoActionsCardStyle: React.CSSProperties = {
  marginTop: 20,
  background: "#fff",
  border: "1px solid #eee7fb",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const avaliacaoActionsRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
};
const avaliacaoActionBtnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  background: "#2f5d31",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
};
const avaliacaoActionBtnSecondary: React.CSSProperties = {
  padding: "10px 16px",
  background: "#fff",
  color: "#2f5d31",
  border: "1px solid #2f5d31",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
};
const avaliacaoActionBtnDisabled: React.CSSProperties = {
  opacity: 0.55, cursor: "not-allowed",
};
const avaliacaoCompareRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
};
const avaliacaoCompareToggleStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  fontSize: 13, fontWeight: 600, color: "#334",
};
const avaliacaoCompareSelectWrapStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
};
const avaliacaoCompareSelectStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 13,
  background: "#fff",
};
const avaliacaoFeedbackBoxStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#334",
  background: "#f6f7f4",
  border: "1px solid #e6ebde",
  borderRadius: 8,
  padding: "6px 10px",
};
// Aliases mantidos para compat. (referências antigas no arquivo).
const avaliacaoBotoesWrapStyle: React.CSSProperties = { display: "none" };
const avaliacaoBtnPrimary: React.CSSProperties = { display: "none" };
const avaliacaoBtnSecondary: React.CSSProperties = { display: "none" };
const avaliacaoBtnDisabled: React.CSSProperties = { display: "none" };
const avaliacaoFeedbackStyle: React.CSSProperties = { display: "none" };
const compareToggleWrapStyle: React.CSSProperties = { display: "none" };
const compareHintStyle: React.CSSProperties = {
  fontSize: 11, color: "#64748b", fontWeight: 500,
};
const avaliacaoExtrasCardStyle: React.CSSProperties = {
  marginTop: 24, background: "#fff", border: "1px solid #eee7fb",
  borderRadius: 20, padding: 24,
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
};
const avaliacaoExtrasTitleStyle: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" };
const avaliacaoExtrasSubtitleStyle: React.CSSProperties = { margin: "4px 0 0 0", fontSize: 14, color: "#6b7280" };
const avaliacaoExtrasGridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14, marginTop: 14,
};
const avaliacaoExtraItemStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4,
  padding: 16, borderRadius: 16, border: "1px solid #ede9fe", background: "#fff",
};
const avaliacaoExtraRotuloStyle: React.CSSProperties = { fontSize: 13, color: "#475569", fontWeight: 600 };
const avaliacaoExtraValorStyle: React.CSSProperties = { fontSize: 24, fontWeight: 800, color: "#111827" };
const avaliacaoPillBaseStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
};
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

const voiceActionWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  flex: 1,
  minWidth: 280,
};

const voiceButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  minWidth: 220,
  padding: "16px 20px",
  borderRadius: 999,
  border: "1px solid #e9d5ff",
  background: "linear-gradient(135deg, #faf5ff, #eef2ff)",
  color: "#6d28d9",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(109, 40, 217, 0.12)",
};

const voiceButtonActiveStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  border: "1px solid transparent",
};

const voiceButtonIconStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
};

const voiceHelpStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#6b7280",
  fontSize: 12,
  maxWidth: 320,
  lineHeight: 1.5,
};

const voiceTranscriptStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#16a34a",
  fontSize: 12,
  fontWeight: 700,
  maxWidth: 360,
  lineHeight: 1.5,
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
  transition: "all 0.2s ease",
};

const voiceFieldFlashStyle: React.CSSProperties = {
  border: "1px solid #86efac",
  boxShadow: "0 0 0 4px rgba(134, 239, 172, 0.25)",
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
