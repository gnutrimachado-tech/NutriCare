import { prisma } from "@/lib/prisma";

export type AvaliacaoHistoricoResumo = {
  pesoKg: number | null;
  bodyFatPct: number | null;
  massaMuscularKg: number | null;
  massaAdiposaKg: number | null;
  aguaPct: number | null;
  imme: number | null;
  img: number | null;
  ffmi: number | null;
  createdAt?: string | null;
  protocolLabel?: string | null;
};

export type AvaliacaoHistoricoSnapshot = {
  createdAt: string;
  protocolLabel: string;
  dobras: Record<string, string | number>;
  circunferencias: Record<string, string | number>;
  resumo: AvaliacaoHistoricoResumo;
};

type PersistArgs = {
  pacienteId: string;
  protocolLabel?: string;
  currentDobras?: Record<string, number>;
  currentCircunferencias?: Record<string, number>;
  resumo: AvaliacaoHistoricoResumo;
};

function toNullableNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildAvaliacaoSnapshot(args: PersistArgs): AvaliacaoHistoricoSnapshot {
  return {
    createdAt: new Date().toISOString(),
    protocolLabel: args.protocolLabel || "",
    dobras: Object.fromEntries(
      Object.entries(args.currentDobras || {}).map(([key, value]) => [key, String(value).replace(".", ",")])
    ),
    circunferencias: Object.fromEntries(
      Object.entries(args.currentCircunferencias || {}).map(([key, value]) => [key, String(value).replace(".", ",")])
    ),
    resumo: {
      pesoKg: toNullableNumber(args.resumo.pesoKg),
      bodyFatPct: toNullableNumber(args.resumo.bodyFatPct),
      massaMuscularKg: toNullableNumber(args.resumo.massaMuscularKg),
      massaAdiposaKg: toNullableNumber(args.resumo.massaAdiposaKg),
      aguaPct: toNullableNumber(args.resumo.aguaPct),
      imme: toNullableNumber(args.resumo.imme),
      img: toNullableNumber(args.resumo.img),
      ffmi: toNullableNumber(args.resumo.ffmi),
      createdAt: args.resumo.createdAt || null,
      protocolLabel: args.resumo.protocolLabel || args.protocolLabel || "",
    },
  };
}

function normalizeSnapshotForCompare(snapshot: AvaliacaoHistoricoSnapshot | null) {
  if (!snapshot) return null;
  return {
    protocolLabel: snapshot.protocolLabel || "",
    dobras: snapshot.dobras || {},
    circunferencias: snapshot.circunferencias || {},
    resumo: {
      pesoKg: toNullableNumber(snapshot.resumo?.pesoKg),
      bodyFatPct: toNullableNumber(snapshot.resumo?.bodyFatPct),
      massaMuscularKg: toNullableNumber(snapshot.resumo?.massaMuscularKg),
      massaAdiposaKg: toNullableNumber(snapshot.resumo?.massaAdiposaKg),
      aguaPct: toNullableNumber(snapshot.resumo?.aguaPct),
      imme: toNullableNumber(snapshot.resumo?.imme),
      img: toNullableNumber(snapshot.resumo?.img),
      ffmi: toNullableNumber(snapshot.resumo?.ffmi),
      protocolLabel: snapshot.resumo?.protocolLabel || snapshot.protocolLabel || "",
    },
  };
}

export async function salvarAvaliacaoHistorico(args: PersistArgs) {
  const snapshot = buildAvaliacaoSnapshot(args);
  const abdomen = toNullableNumber(args.currentCircunferencias?.abdomen);
  const cintura = toNullableNumber(args.currentCircunferencias?.cintura);
  const snapshotJson = JSON.stringify(normalizeSnapshotForCompare(snapshot));

  const ultimoRegistro = await prisma.evolucao_corporal.findFirst({
    where: { paciente_id: args.pacienteId },
    orderBy: { created_at: "desc" },
  });

  const ultimoSnapshot = extrairSnapshotDeEvolucao(ultimoRegistro || {});
  if (ultimoSnapshot && JSON.stringify(normalizeSnapshotForCompare(ultimoSnapshot)) === snapshotJson) {
    return ultimoSnapshot;
  }

  await prisma.evolucao_corporal.create({
    data: {
      paciente_id: args.pacienteId,
      peso: snapshot.resumo.pesoKg,
      percentual_gordura: snapshot.resumo.bodyFatPct,
      massa_muscular: snapshot.resumo.massaMuscularKg,
      circunferencia_abdominal: abdomen ?? cintura,
      observacoes: JSON.stringify({ tipo: "avaliacao_fisica", snapshot }),
    },
  });

  return snapshot;
}

export function extrairSnapshotDeEvolucao(item: {
  observacoes?: string | null;
  created_at?: Date | null;
  peso?: unknown;
  percentual_gordura?: unknown;
  massa_muscular?: unknown;
  circunferencia_abdominal?: unknown;
}) {
  const raw = item?.observacoes;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.snapshot && typeof parsed.snapshot === "object") {
        return parsed.snapshot as AvaliacaoHistoricoSnapshot;
      }
    } catch {
      // ignore e usa fallback abaixo
    }
  }

  const hasFallbackData =
    toNullableNumber(item?.peso) !== null ||
    toNullableNumber(item?.percentual_gordura) !== null ||
    toNullableNumber(item?.massa_muscular) !== null ||
    toNullableNumber(item?.circunferencia_abdominal) !== null;

  if (!hasFallbackData) return null;

  return {
    createdAt: item?.created_at?.toISOString?.() || new Date().toISOString(),
    protocolLabel: "",
    dobras: {},
    circunferencias: item?.circunferencia_abdominal ? { abdomen: String(item.circunferencia_abdominal) } : {},
    resumo: {
      pesoKg: toNullableNumber(item?.peso),
      bodyFatPct: toNullableNumber(item?.percentual_gordura),
      massaMuscularKg: toNullableNumber(item?.massa_muscular),
      massaAdiposaKg: null,
      aguaPct: null,
      imme: null,
      img: null,
      ffmi: null,
      createdAt: item?.created_at?.toISOString?.() || null,
      protocolLabel: "",
    },
  } as AvaliacaoHistoricoSnapshot;
}
