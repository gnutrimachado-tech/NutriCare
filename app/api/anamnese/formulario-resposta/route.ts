import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function toDecimal(valor: unknown): number | null {
  const texto = String(valor || "").replace(",", ".").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return isNaN(numero) ? null : numero;
}

/** Resolve um campo salvo no banco (pode ser plain key ou JSON {key, label}) */
function resolveCampo(campo: string): { fieldKey: string; label: string } {
  try {
    const parsed = JSON.parse(campo);
    return {
      fieldKey: String(parsed.key   ?? campo),
      label:    String(parsed.label ?? campo),
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

    // Aceita envio mesmo sem respostas (todas em branco)
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

    // ── FIX PRINCIPAL: separa colunas conhecidas de campos personalizados ──
    const dadosFixos: Record<string, unknown> = {};
    const extrasTexto: string[] = [];

    for (const campo of formulario.campos) {
      const { fieldKey, label } = resolveCampo(campo);
      const valor = respostasSeguras[fieldKey]; // usa a key resolvida para buscar a resposta

      if (COLUNAS_FIXAS.has(fieldKey)) {
        // Coluna existente na tabela
        if (NUMERICOS.has(fieldKey)) {
          dadosFixos[fieldKey] = toDecimal(valor);
        } else {
          const texto = valor == null ? "" : String(valor).trim();
          dadosFixos[fieldKey] = texto ? texto : null;
        }
      } else if (fieldKey.startsWith("field_")) {
        // Campo personalizado — concatena em observacoes só se houver resposta
        if (valor != null && String(valor).trim()) {
          extrasTexto.push(`${label}: ${String(valor).trim()}`);
        }
      }
      // Qualquer outro campo desconhecido é ignorado com segurança
    }

    // Anexa perguntas personalizadas ao campo observacoes
    if (extrasTexto.length > 0) {
      const separador = "\n\n--- Perguntas personalizadas ---\n";
      const existente = typeof dadosFixos.observacoes === "string" ? dadosFixos.observacoes : "";
      dadosFixos.observacoes = existente + separador + extrasTexto.join("\n");
    }

    // Upsert na tabela anamneses
    const existente = await prisma.anamneses.findFirst({
      where: { paciente_id: formulario.paciente_id },
    });

    if (existente) {
      await prisma.anamneses.update({
        where: { id: existente.id },
        data:  dadosFixos,
      });
    } else {
      await prisma.anamneses.create({
        data: {
          paciente_id: formulario.paciente_id,
          ...dadosFixos,
        },
      });
    }

    // Marca o token como respondido
    await prisma.formulario_tokens.update({
      where: { id: formulario.id },
      data:  { status: "respondido" },
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
    campos:       formulario.campos,   // retorna como estão (client faz o parse)
    pacienteNome: formulario.pacientes.nome,
    status:       formulario.status,
  });
}
