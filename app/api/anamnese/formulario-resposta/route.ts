import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CUSTOM_SECTION_TITLE = "--- Perguntas personalizadas ---";

// Colunas reais da tabela anamneses (todas as outras vão para observacoes)
const COLUNAS_FIXAS = new Set([
  "peso", "altura", "imc", "percentual_gordura", "massa_muscular",
  "massa_adiposa", "agua_corporal", "taxa_metabolica",
  "historico_clinico", "alergias", "medicamentos", "suplementos",
  "habitos_alimentares", "observacoes",
]);

const NUMERICOS = new Set([
  "peso", "altura", "imc", "percentual_gordura", "massa_muscular",
  "massa_adiposa", "agua_corporal", "taxa_metabolica",
]);

type CustomAnswer = {
  fieldKey?: string;
  label: string;
  value: string;
};

function toDecimal(valor: unknown): number | null {
  const texto = String(valor || "").replace(",", ".").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isNaN(numero) ? null : numero;
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extraKey(fieldKey: string | undefined, label: string): string {
  if (fieldKey && fieldKey.startsWith("field_")) return `field:${fieldKey}`;
  return `label:${normalizeLabel(label)}`;
}

function parseObservacoes(rawValue: unknown): {
  baseObservacoes: string;
  extras: Map<string, CustomAnswer>;
} {
  const raw = typeof rawValue === "string" ? rawValue : "";
  const extras = new Map<string, CustomAnswer>();

  if (!raw.trim()) {
    return { baseObservacoes: "", extras };
  }

  const markerIndex = raw.indexOf(CUSTOM_SECTION_TITLE);
  if (markerIndex === -1) {
    return { baseObservacoes: raw.trim(), extras };
  }

  const baseObservacoes = raw.slice(0, markerIndex).trim();
  const customBlock = raw.slice(markerIndex + CUSTOM_SECTION_TITLE.length).trim();
  const lines = customBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const structuredMatch = line.match(/^\[\[(field_[^\]]+)\]\]\s*(.+?)\s*:\s*(.+)$/);
    if (structuredMatch) {
      const [, fieldKey, label, value] = structuredMatch;
      extras.set(extraKey(fieldKey, label), {
        fieldKey,
        label: label.trim(),
        value: value.trim(),
      });
      continue;
    }

    const legacyMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (legacyMatch) {
      const [, label, value] = legacyMatch;
      extras.set(extraKey(undefined, label), {
        label: label.trim(),
        value: value.trim(),
      });
    }
  }

  return { baseObservacoes, extras };
}

function buildObservacoes(baseObservacoes: string, extras: Iterable<CustomAnswer>): string | null {
  const base = String(baseObservacoes || "").trim();
  const extrasLines = Array.from(extras)
    .filter((item) => item.label.trim() && item.value.trim())
    .map((item) => {
      const label = item.label.trim();
      const value = item.value.trim();
      if (item.fieldKey) return `[[${item.fieldKey}]] ${label}: ${value}`;
      return `${label}: ${value}`;
    });

  if (extrasLines.length === 0) {
    return base || null;
  }

  return [base, `${CUSTOM_SECTION_TITLE}\n${extrasLines.join("\n")}`]
    .filter(Boolean)
    .join("\n\n");
}

/** Resolve um campo salvo no banco (pode ser plain key ou JSON {key, label}) */
function resolveCampo(campo: string): { fieldKey: string; label: string } {
  try {
    const parsed = JSON.parse(campo);
    return {
      fieldKey: String(parsed.key ?? campo),
      label: String(parsed.label ?? campo),
    };
  } catch {
    return { fieldKey: campo, label: campo };
  }
}

export async function POST(request: Request) {
  try {
    const { token, respostas } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token é obrigatório." }, { status: 400 });
    }

    const respostasSeguras: Record<string, unknown> =
      respostas && typeof respostas === "object" ? respostas : {};

    const formulario = await prisma.formulario_tokens.findUnique({
      where: { token },
      include: { pacientes: true },
    });

    if (!formulario) {
      return NextResponse.json({ error: "Link inválido." }, { status: 404 });
    }

    if (formulario.status === "respondido") {
      return NextResponse.json({ error: "Este formulário já foi respondido." }, { status: 409 });
    }

    if (new Date() > formulario.expires_at) {
      return NextResponse.json({ error: "Este link expirou." }, { status: 410 });
    }

    const anamneseExistente = await prisma.anamneses.findFirst({
      where: { paciente_id: formulario.paciente_id },
    });

    const observacoesSalvas = parseObservacoes(anamneseExistente?.observacoes);
    const dadosFixos: Record<string, unknown> = {};
    const extrasMap = new Map<string, CustomAnswer>(observacoesSalvas.extras);
    let observacoesFoiEnviada = false;

    for (const campo of formulario.campos) {
      const { fieldKey, label } = resolveCampo(campo);
      const valor = respostasSeguras[fieldKey];

      if (COLUNAS_FIXAS.has(fieldKey)) {
        if (NUMERICOS.has(fieldKey)) {
          dadosFixos[fieldKey] = toDecimal(valor);
        } else {
          const texto = valor == null ? "" : String(valor).trim();
          dadosFixos[fieldKey] = texto ? texto : null;
        }

        if (fieldKey === "observacoes") {
          observacoesFoiEnviada = true;
        }
      } else if (fieldKey.startsWith("field_")) {
        const texto = valor == null ? "" : String(valor).trim();
        if (texto) {
          extrasMap.set(extraKey(fieldKey, label), {
            fieldKey,
            label: label.trim(),
            value: texto,
          });
        }
      }
    }

    const baseObservacoes = observacoesFoiEnviada
      ? String(dadosFixos.observacoes || "").trim()
      : observacoesSalvas.baseObservacoes;

    const observacoesFinal = buildObservacoes(baseObservacoes, extrasMap.values());

    if (observacoesFoiEnviada || observacoesSalvas.extras.size > 0 || extrasMap.size > 0 || observacoesFinal) {
      dadosFixos.observacoes = observacoesFinal;
    }

    if (anamneseExistente) {
      await prisma.anamneses.update({
        where: { id: anamneseExistente.id },
        data: dadosFixos,
      });
    } else {
      await prisma.anamneses.create({
        data: {
          paciente_id: formulario.paciente_id,
          ...dadosFixos,
        },
      });
    }

    await prisma.formulario_tokens.update({
      where: { id: formulario.id },
      data: { status: "respondido" },
    });

    return NextResponse.json({ message: "Respostas salvas com sucesso!" });
  } catch (err) {
    console.error("Erro formulario-resposta POST:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token obrigatório." }, { status: 400 });
  }

  const formulario = await prisma.formulario_tokens.findUnique({
    where: { token },
    include: { pacientes: { select: { nome: true, email: true } } },
  });

  if (!formulario) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }

  if (new Date() > formulario.expires_at) {
    return NextResponse.json({ error: "Link expirado." }, { status: 410 });
  }

  return NextResponse.json({
    campos: formulario.campos,
    pacienteNome: formulario.pacientes.nome,
    status: formulario.status,
  });
}
