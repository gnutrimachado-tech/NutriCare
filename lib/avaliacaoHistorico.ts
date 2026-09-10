// lib/avaliacaoHistorico.ts
// Persistência da avaliação física com REGRA ROTATIVA 1ª / 2ª / 3ª:
// - A 1ª avaliação (mais antiga PELA DATA DA AVALIAÇÃO) NUNCA muda.
// - TODA a ordenação (1ª/2ª/3ª, rotação e comparações) usa a DATA DA AVALIAÇÃO
//   (data_avaliacao), NUNCA a ordem de digitação (created_at).
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
  // Indicadores derivados, salvos junto para o histórico ficar completo:
  massaMuscularEsqueleticaKg?: number | null;
  circunferenciaAbdominalCm?: number | null;
  vo2maxMlKgMin?: number | null;
  imc?: number | null;
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

// Normaliza uma data (Date ou string) para "yyyy-mm-dd" usando UTC — evita
// que o fuso horário desloque o dia da avaliação.
function normalizarDataAvaliacao(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Timestamp de referência da avaliação: prioriza a DATA DA AVALIAÇÃO e só usa
// created_at quando ela não existir. Meio-dia UTC evita problemas de fuso.
function timestampAvaliacao(dataAvaliacao: unknown, createdAt: unknown): number {
  const data = normalizarDataAvaliacao(dataAvaliacao) || normalizarDataAvaliacao(createdAt);
  return data ? new Date(`${data}T12:00:00.000Z`).getTime() : 0;
}

// Garante que snapshots antigos (sem os campos derivados) voltem completos.
function normalizeSnapshot(snapshot: AvaliacaoHistoricoSnapshot): AvaliacaoHistoricoSnapshot {
  const resumo = snapshot.resumo || ({} as AvaliacaoHistoricoResumo);
  return {
    ...snapshot,
    dobras: snapshot.dobras || {},
    circunferencias: snapshot.circunferencias || {},
    resumo: {
      pesoKg: toNullableNumber(resumo.pesoKg),
      bodyFatPct: toNullableNumber(resumo.bodyFatPct),
      massaMuscularKg: toNullableNumber(resumo.massaMuscularKg),
      massaAdiposaKg: toNullableNumber(resumo.massaAdiposaKg),
      aguaPct: toNullableNumber(resumo.aguaPct),
      imme: toNullableNumber(resumo.imme),
      img: toNullableNumber(resumo.img),
      ffmi: toNullableNumber(resumo.ffmi),
      massaMuscularEsqueleticaKg: toNullableNumber(resumo.massaMuscularEsqueleticaKg),
      circunferenciaAbdominalCm: toNullableNumber(resumo.circunferenciaAbdominalCm),
      vo2maxMlKgMin: toNullableNumber(resumo.vo2maxMlKgMin),
      imc: toNullableNumber(resumo.imc),
      createdAt: resumo.createdAt || snapshot.createdAt || null,
      protocolLabel: resumo.protocolLabel || snapshot.protocolLabel || "",
    },
  };
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
      bodyFatPct: toNullableNumber(args.resumo.bodyFatPct),
      massaMuscularKg: toNullableNumber(args.resumo.massaMuscularKg),
      massaAdiposaKg: toNullableNumber(args.resumo.massaAdiposaKg),
      aguaPct: toNullableNumber(args.resumo.aguaPct),
      imme: toNullableNumber(args.resumo.imme),
      img: toNullableNumber(args.resumo.img),
      ffmi: toNullableNumber(args.resumo.ffmi),
      massaMuscularEsqueleticaKg: toNullableNumber(args.resumo.massaMuscularEsqueleticaKg),
      circunferenciaAbdominalCm: toNullableNumber(args.resumo.circunferenciaAbdominalCm),
      vo2maxMlKgMin: toNullableNumber(args.resumo.vo2maxMlKgMin),
      imc: toNullableNumber(args.resumo.imc),
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
        return normalizeSnapshot(parsed.snapshot as AvaliacaoHistoricoSnapshot);
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
      massaAdiposaKg: null,
      aguaPct: null,
      imme: null,
      img: null,
      ffmi: null,
      massaMuscularEsqueleticaKg: null,
      circunferenciaAbdominalCm: toNullableNumber(item?.circunferencia_abdominal),
      vo2maxMlKgMin: null,
      imc: null,
      createdAt: item?.created_at?.toISOString?.() || null,
      protocolLabel: "",
    },
  };
}

// -------------------- LEITURA (usada pelo page.tsx e pelas rotas) --------------------

async function listarTodasOrdenadasPorData(pacienteId: string) {
  // Ordena pela DATA DA AVALIAÇÃO (data_avaliacao; se ausente, created_at),
  // nunca pela ordem de digitação: 02/06 é anterior a 10/09 mesmo que tenha
  // sido lançada depois no sistema.
  const rows = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
  });
  rows.sort((a, b) => {
    const aTime = timestampAvaliacao(a.data_avaliacao, a.created_at);
    const bTime = timestampAvaliacao(b.data_avaliacao, b.created_at);
    if (aTime !== bTime) return aTime - bTime;
    return String(a.id).localeCompare(String(b.id));
  });
  return rows;
}

export async function listarUltimasTresAvaliacoes(pacienteId: string) {
  const rows = await listarTodasOrdenadasPorData(pacienteId);

  // Regra: mantém 1ª (mais antiga por data) + últimas 2 (rotativas).
  if (rows.length <= 3) return rows;
  const first = rows[0];
  const lastTwo = rows.slice(-2);
  return [first, ...lastTwo];
}

export async function primeiraAvaliacao(pacienteId: string) {
  // A "primeira" é a de DATA mais antiga, não a primeira digitada.
  const ordenadas = await listarTodasOrdenadasPorData(pacienteId);
  return ordenadas[0] || null;
}

export async function ultimaAvaliacao(pacienteId: string) {
  return prisma.evolucao_corporal.findFirst({
    where: { paciente_id: pacienteId },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
}

// -------------------- ESCRITA COM ROTAÇÃO --------------------

export async function salvarAvaliacaoHistorico(args: PersistArgs) {
  const snapshot = buildAvaliacaoSnapshot(args);
  const abdomen = toNullableNumber(args.currentCircunferencias?.abdomen);
  const cintura = toNullableNumber(args.currentCircunferencias?.cintura);

  // Aplica a rotação ANTES de inserir, pela DATA DA AVALIAÇÃO (não pela ordem
  // de digitação): se já existirem >= 3, apaga o(s) registro(s) "do meio",
  // mantendo sempre a MAIS ANTIGA (1ª fixa) e a MAIS RECENTE por data.
  const existentes = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: args.pacienteId },
    select: { id: true, created_at: true, data_avaliacao: true },
  });
  existentes.sort((a, b) => {
    const aTime = timestampAvaliacao(a.data_avaliacao, a.created_at);
    const bTime = timestampAvaliacao(b.data_avaliacao, b.created_at);
    if (aTime !== bTime) return aTime - bTime;
    return String(a.id).localeCompare(String(b.id));
  });

  if (existentes.length >= 3) {
    // remove todos exceto o primeiro (1ª fixa) e o último (3ª atual)
    // — se houver mais que 3 por qualquer motivo, limpa o meio inteiro.
    const meio = existentes.slice(1, existentes.length - 1);
    if (meio.length > 0) {
      await prisma.evolucao_corporal.deleteMany({
        where: { id: { in: meio.map((r) => r.id) } },
      });
    }
  }

  // created_at guarda apenas o instante real do lançamento (auditoria) — a
  // ordenação das avaliações é sempre por data_avaliacao. O ajuste de 1 ms
  // evita empate quando duas avaliações são registradas no mesmo instante.
  const agora = new Date();
  const ultimoCriado = existentes.reduce<Date | null>(
    (acc, r) => (r.created_at && (!acc || r.created_at > acc) ? r.created_at : acc),
    null
  );
  const createdAt =
    ultimoCriado && ultimoCriado.getTime() >= agora.getTime()
      ? new Date(ultimoCriado.getTime() + 1)
      : agora;
  snapshot.createdAt = createdAt.toISOString();
  snapshot.resumo.createdAt = createdAt.toISOString();

  // Indicadores derivados — mantêm o resumo do histórico completo, como o
  // card COMPOSIÇÃO CORPORAL do PDF: músculo esquelético = 50% da massa
  // livre de gordura; IMC = IMG + FFMI; cintura/abdominal também no resumo.
  const mmEsqueleticaDerivada =
    snapshot.resumo.massaMuscularEsqueleticaKg ??
    toNullableNumber(
      snapshot.resumo.massaMuscularKg !== null
        ? snapshot.resumo.massaMuscularKg * 0.5
        : null
    );
  const imcDerivado =
    snapshot.resumo.imc ??
    toNullableNumber(
      snapshot.resumo.img !== null && snapshot.resumo.ffmi !== null
        ? snapshot.resumo.img + snapshot.resumo.ffmi
        : null
    );
  const circAbdominalDerivada =
    snapshot.resumo.circunferenciaAbdominalCm ?? abdomen ?? cintura;
  snapshot.resumo = {
    ...snapshot.resumo,
    massaMuscularEsqueleticaKg: mmEsqueleticaDerivada,
    circunferenciaAbdominalCm: circAbdominalDerivada,
    imc: imcDerivado,
  };

  const criado = await prisma.evolucao_corporal.create({
    data: {
      paciente_id: args.pacienteId,
      peso: snapshot.resumo.pesoKg,
      percentual_gordura: snapshot.resumo.bodyFatPct,
      massa_muscular: snapshot.resumo.massaMuscularKg,
      circunferencia_abdominal: circAbdominalDerivada,
      data_avaliacao: toDateOnly(snapshot.dataAvaliacao),
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
