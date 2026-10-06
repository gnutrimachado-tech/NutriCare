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
import { FRACAO_MUSCULO_ESQUELETICO } from "@/lib/bodyComposition";

export type AvaliacaoHistoricoResumo = {
  pesoKg: number | null;
  alturaCm?: number | null;
  bodyFatPct: number | null;
  massaMuscularKg: number | null;
  massaMuscularEsqueleticaKg?: number | null;
  massaLivreGorduraKg?: number | null;
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
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function snapshotSalvo(item: { observacoes?: string | null }) {
  if (!item.observacoes) return null;
  try {
    const parsed = JSON.parse(item.observacoes);
    return parsed?.snapshot && typeof parsed.snapshot === "object"
      ? (parsed.snapshot as AvaliacaoHistoricoSnapshot)
      : null;
  } catch {
    return null;
  }
}

function dataAvaliacaoKey(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function dataAvaliacaoDoRegistro(item: {
  observacoes?: string | null;
  data_avaliacao?: Date | null;
  created_at?: Date | null;
}) {
  const snapshot = snapshotSalvo(item);
  return (
    dataAvaliacaoKey(snapshot?.dataAvaliacao) ||
    dataAvaliacaoKey(item.data_avaliacao) ||
    dataAvaliacaoKey(item.created_at) ||
    ""
  );
}

function ordenarPorDataAvaliacao<
  T extends { id: string; observacoes?: string | null; data_avaliacao?: Date | null; created_at?: Date | null },
>(rows: T[]) {
  return rows.sort((a, b) => {
    const porData = dataAvaliacaoDoRegistro(a).localeCompare(dataAvaliacaoDoRegistro(b));
    if (porData) return porData;
    const porCriacao = (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0);
    return porCriacao || a.id.localeCompare(b.id);
  });
}

export function obterMassaMuscularHistorica(
  snapshot: AvaliacaoHistoricoSnapshot | null,
  massaMuscularBanco: unknown,
  alturaCm: number,
) {
  const resumo = snapshot?.resumo;
  const massaMuscularEsqueletica = toNullableNumber(resumo?.massaMuscularEsqueleticaKg);
  if (massaMuscularEsqueletica !== null) return massaMuscularEsqueletica;

  // Os snapshots recentes guardam explicitamente massa muscular e massa livre
  // de gordura; snapshots antigos guardavam somente a massa livre de gordura.
  const massaMuscularSalva = toNullableNumber(resumo?.massaMuscularKg);
  if (massaMuscularSalva !== null && toNullableNumber(resumo?.massaLivreGorduraKg) !== null) {
    return massaMuscularSalva;
  }

  const imme = toNullableNumber(resumo?.imme);
  const alturaHistorica = toNullableNumber(resumo?.alturaCm) ?? alturaCm;
  if (imme !== null && imme > 0 && alturaHistorica > 0) {
    const h = alturaHistorica / 100;
    return Math.round(imme * h * h * 10) / 10;
  }

  const massaLivreGorduraAntiga =
    toNullableNumber(resumo?.massaLivreGorduraKg) ??
    massaMuscularSalva ??
    toNullableNumber(massaMuscularBanco);
  if (massaLivreGorduraAntiga === null) return null;
  return Math.round(massaLivreGorduraAntiga * FRACAO_MUSCULO_ESQUELETICO * 10) / 10;
}

export function buildAvaliacaoSnapshot(args: PersistArgs): AvaliacaoHistoricoSnapshot {
  return {
    createdAt: new Date().toISOString(),
    dataAvaliacao: normalizeDataAvaliacao(args.dataAvaliacao) || new Date().toISOString(),
    protocolLabel: args.protocolLabel || "",
    dobras: Object.fromEntries(
      Object.entries(args.currentDobras || {}).map(([k, v]) => [k, String(v).replace(".", ",")])
    ),
    circunferencias: Object.fromEntries(
      Object.entries(args.currentCircunferencias || {}).map(([k, v]) => [k, String(v).replace(".", ",")])
    ),
    resumo: {
      pesoKg: toNullableNumber(args.resumo.pesoKg),
      alturaCm: toNullableNumber(args.resumo.alturaCm),
      bodyFatPct: toNullableNumber(args.resumo.bodyFatPct),
      massaMuscularKg: toNullableNumber(args.resumo.massaMuscularKg),
      massaMuscularEsqueleticaKg: toNullableNumber(
        args.resumo.massaMuscularEsqueleticaKg ?? args.resumo.massaMuscularKg
      ),
      massaLivreGorduraKg: toNullableNumber(args.resumo.massaLivreGorduraKg),
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
  data_avaliacao?: Date | null;
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
        return parsed.snapshot as AvaliacaoHistoricoSnapshot;
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
    dataAvaliacao:
      item?.data_avaliacao?.toISOString?.() ||
      item?.created_at?.toISOString?.() ||
      null,
    protocolLabel: "",
    dobras: {},
    circunferencias: item?.circunferencia_abdominal
      ? { abdomen: String(item.circunferencia_abdominal) }
      : {},
    resumo: {
      pesoKg: toNullableNumber(item?.peso),
      bodyFatPct: toNullableNumber(item?.percentual_gordura),
      massaMuscularKg: toNullableNumber(item?.massa_muscular),
      massaMuscularEsqueleticaKg: null,
      massaLivreGorduraKg: null,
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
  const rows = ordenarPorDataAvaliacao(await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  }));

  // Regra: mantém 1ª (mais antiga) + últimas 2 (rotativas).
  if (rows.length <= 3) return rows;
  const first = rows[0];
  const lastTwo = rows.slice(-2);
  return [first, ...lastTwo];
}

export async function primeiraAvaliacao(pacienteId: string) {
  const rows = ordenarPorDataAvaliacao(await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  }));
  return rows[0] ?? null;
}

export async function ultimaAvaliacao(pacienteId: string) {
  const rows = ordenarPorDataAvaliacao(await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  }));
  return rows[rows.length - 1] ?? null;
}

// -------------------- ESCRITA COM ROTAÇÃO --------------------

export async function salvarAvaliacaoHistorico(args: PersistArgs) {
  const snapshot = buildAvaliacaoSnapshot(args);
  const abdomen = toNullableNumber(args.currentCircunferencias?.abdomen);
  const cintura = toNullableNumber(args.currentCircunferencias?.cintura);
  const dataAvaliacao = toDateOnly(snapshot.dataAvaliacao);
  const dataAvaliacaoKeyAtual = dataAvaliacaoKey(snapshot.dataAvaliacao);

  const existentes = ordenarPorDataAvaliacao(await prisma.evolucao_corporal.findMany({
    where: { paciente_id: args.pacienteId },
  }));

  // Uma data de avaliação identifica um único registro. Salvar novamente essa
  // data substitui seus valores, sem criar outra avaliação ou avançar a rotação.
  const mesmoDia = [...existentes]
    .reverse()
    .find((registro) => dataAvaliacaoDoRegistro(registro) === dataAvaliacaoKeyAtual);

  if (mesmoDia) {
    const createdAt = mesmoDia.created_at ?? new Date();
    snapshot.createdAt = createdAt.toISOString();
    snapshot.resumo.createdAt = createdAt.toISOString();
    const atualizado = await prisma.evolucao_corporal.update({
      where: { id: mesmoDia.id },
      data: {
        peso: snapshot.resumo.pesoKg,
        percentual_gordura: snapshot.resumo.bodyFatPct,
        massa_muscular: snapshot.resumo.massaMuscularEsqueleticaKg ?? snapshot.resumo.massaMuscularKg,
        circunferencia_abdominal: abdomen ?? cintura,
        data_avaliacao: dataAvaliacao,
        observacoes: JSON.stringify({ tipo: "avaliacao_fisica", snapshot }),
      },
    });

    return {
      snapshot,
      id: atualizado.id,
      createdAt: atualizado.created_at?.toISOString?.() || createdAt.toISOString(),
    };
  }

  // Aplica a rotação ANTES de inserir: mantém a 1ª e as duas avaliações mais
  // recentes pela data da avaliação, não pelo momento em que foram cadastradas.
  if (existentes.length >= 3) {
    // Remove todos exceto a primeira avaliação e a mais recente.
    const meio = existentes.slice(1, existentes.length - 1);
    if (meio.length > 0) {
      await prisma.evolucao_corporal.deleteMany({
        where: { id: { in: meio.map((r) => r.id) } },
      });
    }
    // Após a limpeza, a antiga mais recente fica em 2º lugar e o registro novo
    // passa a ocupar a posição mais recente pela data da avaliação.
  }

  // created_at registra o momento em que o sistema persistiu a avaliação;
  // data_avaliacao determina sua posição cronológica clínica.
  const agora = new Date();
  const ultimoCriado = existentes.reduce<Date | null>((maisRecente, registro) => {
    const atual = registro.created_at;
    return atual && (!maisRecente || atual > maisRecente) ? atual : maisRecente;
  }, null);
  const createdAt =
    ultimoCriado && ultimoCriado.getTime() >= agora.getTime()
      ? new Date(ultimoCriado.getTime() + 1)
      : agora;
  snapshot.createdAt = createdAt.toISOString();
  snapshot.resumo.createdAt = createdAt.toISOString();

  const criado = await prisma.evolucao_corporal.create({
    data: {
      paciente_id: args.pacienteId,
      peso: snapshot.resumo.pesoKg,
      percentual_gordura: snapshot.resumo.bodyFatPct,
      massa_muscular:
        snapshot.resumo.massaMuscularEsqueleticaKg ?? snapshot.resumo.massaMuscularKg,
      circunferencia_abdominal: abdomen ?? cintura,
      data_avaliacao: dataAvaliacao,
      observacoes: JSON.stringify({ tipo: "avaliacao_fisica", snapshot }),
      created_at: createdAt,
    },
  });

  return {
    snapshot,
    id: criado.id,
    createdAt: criado.created_at?.toISOString?.() || createdAt.toISOString(),
  };
}

function normalizeDataAvaliacao(value?: string | null) {
  if (!value) return null;
  const texto = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const date = new Date(`${texto}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : texto;
  }
  const date = new Date(texto);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toDateOnly(value?: string | null) {
  const normalized = normalizeDataAvaliacao(value);
  if (!normalized) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T12:00:00.000Z`);
  }
  return new Date(normalized);
}
