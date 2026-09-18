// lib/avaliacaoHistorico.ts
// Persistência da avaliação física com REGRA ROTATIVA 1ª / 2ª / 3ª:
// - A 1ª avaliação (mais antiga) NUNCA muda.
// - Quando chega uma nova, ela vira a "3ª" e a antiga 3ª desce para "2ª".
// - Ou seja: mantemos exatamente 3 registros → [1ª fixa, 2ª, 3ª].
//   Ex.: [20/06], [20/07], [20/08] → nova em 20/09 → [20/06], [20/08], [20/09].
//
// Como o schema atual só tem prisma.evolucao_corporal, guardamos o snapshot
// completo dentro de `observacoes` como JSON. A rotação é aplicada apagando
// o registro "do meio" (2º mais antigo) ANTES de inserir a nova avaliação,
// quando já existirem 3 registros.

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
  dataAvaliacao?: string | null;
  protocolLabel: string;
  dobras: Record<string, string | number>;
  circunferencias: Record<string, string | number>;
  resumo: AvaliacaoHistoricoResumo;
};

type PersistArgs = {
  pacienteId: string;
  dataAvaliacao?: string | null;
  protocolLabel?: string;
  currentDobras?: Record<string, number>;
  currentCircunferencias?: Record<string, number>;
  resumo: AvaliacaoHistoricoResumo;
};

function toNullableNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) {
    return toDateOnly(value.toISOString());
  }
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? `${match[1]}-${match[2]}-${match[3]}`
    : null;
}

function dateOnlyTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toDateOnlyDate(value: string | null | undefined) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function buildAvaliacaoSnapshot(args: PersistArgs): AvaliacaoHistoricoSnapshot {
  return {
    createdAt: new Date().toISOString(),
    dataAvaliacao: toDateOnly(args.dataAvaliacao),
    protocolLabel: args.protocolLabel || "",
    dobras: Object.fromEntries(
      Object.entries(args.currentDobras || {}).map(([k, v]) => [k, String(v).replace(".", ",")])
    ),
    circunferencias: Object.fromEntries(
      Object.entries(args.currentCircunferencias || {}).map(([k, v]) => [k, String(v).replace(".", ",")])
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

export function extrairSnapshotDeEvolucao(item: {
  observacoes?: string | null;
  created_at?: Date | null;
  data_avaliacao?: Date | string | null;
  peso?: unknown;
  percentual_gordura?: unknown;
  massa_muscular?: unknown;
  circunferencia_abdominal?: unknown;
}): AvaliacaoHistoricoSnapshot | null {
  const raw = item?.observacoes;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.snapshot && typeof parsed.snapshot === "object") {
        const snapshot = parsed.snapshot as AvaliacaoHistoricoSnapshot;
        return {
          ...snapshot,
          dataAvaliacao:
            snapshot.dataAvaliacao ||
            toDateOnly(item?.data_avaliacao) ||
            null,
        };
      }
    } catch {
      // fallback abaixo
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
    dataAvaliacao: toDateOnly(item?.data_avaliacao),
    protocolLabel: "",
    dobras: {},
    circunferencias: item?.circunferencia_abdominal
      ? { abdomen: String(item.circunferencia_abdominal) }
      : {},
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
  };
}

// -------------------- LEITURA (usada pelo page.tsx e pelas rotas) --------------------

export async function listarUltimasTresAvaliacoes(pacienteId: string) {
  const rows = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
    orderBy: { created_at: "asc" },
  });

  const ordenadas = rows
    .map((row, index) => {
      const snapshot = extrairSnapshotDeEvolucao(row);
      const data = snapshot?.dataAvaliacao || toDateOnly(row.data_avaliacao);
      const dataTimestamp = data ? dateOnlyTimestamp(data) : row.created_at?.getTime?.() || 0;
      return { row, index, dataTimestamp };
    })
    .sort((a, b) => a.dataTimestamp - b.dataTimestamp || a.index - b.index)
    .map(({ row }) => row);

  // Regra: mantém 1ª (mais antiga) + últimas 2 (rotativas).
  if (ordenadas.length <= 3) return ordenadas;
  const first = ordenadas[0];
  const lastTwo = ordenadas.slice(-2);
  return [first, ...lastTwo];
}

export async function primeiraAvaliacao(pacienteId: string) {
  const avaliacoes = await listarUltimasTresAvaliacoes(pacienteId);
  return avaliacoes[0] || null;
}

export async function ultimaAvaliacao(pacienteId: string) {
  const avaliacoes = await listarUltimasTresAvaliacoes(pacienteId);
  return avaliacoes[avaliacoes.length - 1] || null;
}

// -------------------- ESCRITA COM ROTAÇÃO --------------------

export async function salvarAvaliacaoHistorico(args: PersistArgs) {
  const snapshot = buildAvaliacaoSnapshot(args);
  const dataAvaliacao = toDateOnlyDate(args.dataAvaliacao);
  const abdomen = toNullableNumber(args.currentCircunferencias?.abdomen);
  const cintura = toNullableNumber(args.currentCircunferencias?.cintura);

  // Aplica a rotação ANTES de inserir:
  // Se já existirem >= 3, apaga o "do meio" (2º mais antigo) — os últimos 2 são
  // os que continuam vivos (o mais antigo é a 1ª e não sai).
  const existentes = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: args.pacienteId },
    orderBy: { created_at: "asc" },
  });

  const existentesOrdenados = existentes
    .map((row, index) => {
      const snapshotAtual = extrairSnapshotDeEvolucao(row);
      const data = snapshotAtual?.dataAvaliacao || toDateOnly(row.data_avaliacao);
      const dataTimestamp = data ? dateOnlyTimestamp(data) : row.created_at?.getTime?.() || 0;
      return { row, index, dataTimestamp };
    })
    .sort((a, b) => a.dataTimestamp - b.dataTimestamp || a.index - b.index)
    .map(({ row }) => row);

  if (existentesOrdenados.length >= 3) {
    // remove todos exceto o primeiro (1ª fixa) e o último (3ª atual)
    // — se houver mais que 3 por qualquer motivo, limpa o meio inteiro.
    const meio = existentesOrdenados.slice(1, existentesOrdenados.length - 1);
    if (meio.length > 0) {
      await prisma.evolucao_corporal.deleteMany({
        where: { id: { in: meio.map((r) => r.id) } },
      });
    }
    // Após a limpeza, a antiga "3ª" vira "2ª" naturalmente pois o novo insert
    // passa a ocupar a posição de "3ª" (created_at mais recente).
  }

  await prisma.evolucao_corporal.create({
    data: {
      paciente_id: args.pacienteId,
      peso: snapshot.resumo.pesoKg,
      percentual_gordura: snapshot.resumo.bodyFatPct,
      massa_muscular: snapshot.resumo.massaMuscularKg,
      circunferencia_abdominal: abdomen ?? cintura,
      ...(dataAvaliacao ? { data_avaliacao: dataAvaliacao } : {}),
      observacoes: JSON.stringify({ tipo: "avaliacao_fisica", snapshot }),
    },
  });

  return snapshot;
}
