// lib/avaliacaoHistorico.ts
// Persistência da avaliação física com REGRA ROTATIVA 1ª / 2ª / 3ª,
// ordenada pela DATA DA AVALIAÇÃO informada pelo nutri (data_avaliacao):
// - A avaliação com a data MAIS ANTIGA é sempre a 1ª (referência "Antes").
// - A de data mais recente é sempre a 3ª (a "Atual").
// - Quando uma 4ª avaliação é salva, ela entra como a nova 3ª (mais recente),
//   a antiga 3ª desce para 2ª e a antiga 2ª sai — a 1ª NUNCA muda.
//   Ex.: [02/06], [02/07], [02/08] → nova em 02/09 → [02/06], [02/08], [02/09].
//
// Como o schema atual só tem prisma.evolucao_corporal, guardamos o snapshot
// completo dentro de `observacoes` como JSON e a data real da avaliação na
// coluna `data_avaliacao` (fallback: created_at para registros antigos).

import { prisma } from "@/lib/prisma";

// Ponte de chaves: o front salva as circunferências como biceps_* e o PDF
// lê na ordem braco_*. Esta ponte garante que os valores entrem nas linhas
// corretas sem mexer em nenhum layout.
export const PONTE_CHAVES_CIRC: Record<string, string> = {
  biceps_direito: "braco_direito",
  biceps_esquerdo: "braco_esquerdo",
  braco_direito: "biceps_direito",
  braco_esquerdo: "biceps_esquerdo",
};

export function mapaSnapshotParaNumerosComPonte(
  values: Record<string, string | number> | null | undefined
): Record<string, number> {
  const base = mapaSnapshotParaNumeros(values);
  const out: Record<string, number> = { ...base };
  for (const [de, para] of Object.entries(PONTE_CHAVES_CIRC)) {
    if (out[de] !== undefined && out[para] === undefined) out[para] = out[de];
    else if (out[para] !== undefined && out[de] === undefined) out[de] = out[para];
  }
  return out;
}

// Ponto de série (peso / massa muscular / % gordura) com a data REAL da
// avaliação. O PDF usa esse campo para ordenar — nunca pela data de digitação.
export type EvolucaoPontoHistorico = {
  id: string;
  data: string;
  dataAvaliacao: string | null;
  createdAt: string | null;
  peso: number | null;
  massaMuscular: number | null;
  bfPct: number | null;
};

// Monta o ponto de evolução de um registro do banco, lendo a data da
// avaliação salva no snapshot (fallback: coluna data_avaliacao → created_at).
export function evolucaoPontoDeRegistro(
  r: {
    id: string;
    data_avaliacao?: Date | null;
    created_at?: Date | null;
    peso?: unknown;
    massa_muscular?: unknown;
    percentual_gordura?: unknown;
  },
  fmtData: (d: Date | string | null | undefined) => string
): EvolucaoPontoHistorico {
  const snap = extrairSnapshotDeEvolucao(r);
  const baseData: any = snap?.dataAvaliacao || r.data_avaliacao || r.created_at || null;
  return {
    id: r.id,
    data: fmtData(baseData),
    dataAvaliacao:
      typeof baseData === "string" ? baseData : baseData?.toISOString?.() || null,
    createdAt: r.created_at?.toISOString?.() || null,
    peso: snap?.resumo.pesoKg ?? (Number(r.peso ?? 0) || null),
    massaMuscular: snap?.resumo.massaMuscularKg ?? (Number(r.massa_muscular ?? 0) || null),
    bfPct: snap?.resumo.bodyFatPct ?? (Number(r.percentual_gordura ?? 0) || null),
  };
}

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
  // Campos extras opcionais aceitos na entrada (a rota /salvar envia alguns
  // deles). Não são persistidos no snapshot — apenas evitam erro de tipo.
  massaMuscularEsqueleticaKg?: number | null;
  circunferenciaAbdominalCm?: number | null;
  vo2maxMlKgMin?: number | null;
  imc?: number | null;
};

export type AvaliacaoHistoricoSnapshot = {
  createdAt: string;
  // Data REAL da avaliação (a que o nutri informou), em ISO ou "YYYY-MM-DD".
  dataAvaliacao?: string | null;
  protocolLabel: string;
  dobras: Record<string, string | number>;
  circunferencias: Record<string, string | number>;
  resumo: AvaliacaoHistoricoResumo;
};

export function mapaSnapshotParaNumeros(
  values: Record<string, string | number> | null | undefined
): Record<string, number> {
  const entries: Array<[string, number]> = [];
  for (const [key, value] of Object.entries(values || {})) {
    const numberValue = Number(String(value).replace(",", "."));
    if (Number.isFinite(numberValue)) entries.push([key, numberValue]);
  }
  return Object.fromEntries(entries);
}

type PersistArgs = {
  pacienteId: string;
  // "YYYY-MM-DD" (input type=date) ou ISO. Se ausente, usa a data do dia.
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

// Normaliza a data informada pelo nutri para "YYYY-MM-DD" (string) e Date (UTC).
export function normalizarDataAvaliacao(value?: string | null): {
  iso: string | null;
  date: Date | null;
} {
  if (!value) return { iso: null, date: null };
  const raw = String(value).trim();
  if (!raw) return { iso: null, date: null };

  // Aceita "YYYY-MM-DD" direto do input date.
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    const date = new Date(`${iso}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return { iso: null, date: null };
    return { iso, date };
  }

  // Aceita ISO completo.
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { iso: null, date: null };
  const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
  return { iso, date: new Date(`${iso}T00:00:00.000Z`) };
}

export function buildAvaliacaoSnapshot(args: PersistArgs): AvaliacaoHistoricoSnapshot {
  const { iso } = normalizarDataAvaliacao(args.dataAvaliacao);
  return {
    createdAt: new Date().toISOString(),
    dataAvaliacao: iso,
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
        const snap = parsed.snapshot as AvaliacaoHistoricoSnapshot;
        // Registros antigos podem não ter dataAvaliacao no snapshot: usa a coluna.
        if (!snap.dataAvaliacao && item?.data_avaliacao) {
          snap.dataAvaliacao = item.data_avaliacao.toISOString();
        }
        return snap;
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
    dataAvaliacao: item?.data_avaliacao?.toISOString?.() || null,
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

// -------------------- ORDENAÇÃO PELA DATA DA AVALIAÇÃO --------------------
// Regra central: a "1ª avaliação" é a de data_avaliacao MAIS ANTIGA (não a de
// digitação). created_at desempata avaliações salvas na mesma data.

type RowOrdenavel = {
  id: string;
  created_at?: Date | null;
  data_avaliacao?: Date | null;
  observacoes?: string | null;
  peso?: unknown;
  massa_muscular?: unknown;
  percentual_gordura?: unknown;
  circunferencia_abdominal?: unknown;
};

function tempoOrdenacao(r: RowOrdenavel) {
  const base = r.data_avaliacao || r.created_at || new Date(0);
  const t = new Date(base).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function ordenarAvaliacoes<T extends RowOrdenavel>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byData = tempoOrdenacao(a) - tempoOrdenacao(b);
    if (byData !== 0) return byData;
    const byCreated =
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    if (byCreated !== 0) return byCreated;
    return a.id.localeCompare(b.id);
  });
}

// -------------------- LEITURA (usada pelo page.tsx e pelas rotas) --------------------

export async function listarUltimasTresAvaliacoes(pacienteId: string) {
  const rows = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  });

  const ordenadas = ordenarAvaliacoes(rows);

  // Regra: mantém 1ª (data mais antiga) + últimas 2 (rotativas).
  if (ordenadas.length <= 3) return ordenadas;
  const first = ordenadas[0];
  const lastTwo = ordenadas.slice(-2);
  return [first, ...lastTwo];
}

export async function primeiraAvaliacao(pacienteId: string) {
  const rows = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  });
  const ordenadas = ordenarAvaliacoes(rows);
  return ordenadas[0] || null;
}

export async function ultimaAvaliacao(pacienteId: string) {
  const rows = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  });
  const ordenadas = ordenarAvaliacoes(rows);
  return ordenadas[ordenadas.length - 1] || null;
}

// -------------------- ESCRITA COM ROTAÇÃO --------------------

export async function salvarAvaliacaoHistorico(args: PersistArgs) {
  const snapshot = buildAvaliacaoSnapshot(args);
  const abdomen = toNullableNumber(args.currentCircunferencias?.abdomen);
  const cintura = toNullableNumber(args.currentCircunferencias?.cintura);
  const { iso: dataIso, date: dataDate } = normalizarDataAvaliacao(args.dataAvaliacao);
  if (dataIso) snapshot.dataAvaliacao = dataIso;

  const criado = await prisma.evolucao_corporal.create({
    data: {
      paciente_id: args.pacienteId,
      // Grava a data REAL da avaliação informada pelo nutri.
      // Sem data informada, cai no default CURRENT_DATE do banco (data do dia).
      ...(dataDate ? { data_avaliacao: dataDate } : {}),
      peso: snapshot.resumo.pesoKg,
      percentual_gordura: snapshot.resumo.bodyFatPct,
      massa_muscular: snapshot.resumo.massaMuscularKg,
      circunferencia_abdominal: abdomen ?? cintura,
      observacoes: JSON.stringify({ tipo: "avaliacao_fisica", snapshot }),
    },
  });

  // ROTAÇÃO (após inserir, ordenando pela data da avaliação):
  // Mantém exatamente 3 registros → [1ª (mais antiga, fixa), 2ª, 3ª (recente)].
  // Ao salvar a 4ª, a nova entra como 3ª, a antiga 3ª vira 2ª e o "meio" sai.
  const existentes = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: args.pacienteId },
    select: { id: true, created_at: true, data_avaliacao: true },
  });

  if (existentes.length > 3) {
    const ordenadas = ordenarAvaliacoes(existentes);
    const manter = new Set<string>([
      ordenadas[0].id,
      ...ordenadas.slice(-2).map((r) => r.id),
    ]);
    const remover = ordenadas.filter((r) => !manter.has(r.id)).map((r) => r.id);
    if (remover.length > 0) {
      await prisma.evolucao_corporal.deleteMany({
        where: { id: { in: remover } },
      });
    }
  }

  return {
    snapshot,
    id: criado.id,
    createdAt: criado.created_at?.toISOString?.() || new Date().toISOString(),
  };
}
