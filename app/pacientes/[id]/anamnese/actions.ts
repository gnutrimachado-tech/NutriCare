"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseFormData(formData: FormData) {
  const toDecimal = (valor: FormDataEntryValue | null) => {
    const texto = String(valor || "").replace(",", ".").trim();
    if (!texto) return null;
    const numero = Number(texto);
    if (Number.isNaN(numero)) return null;
    return numero;
  };

  return {
    peso: toDecimal(formData.get("peso")),
    altura: toDecimal(formData.get("altura")),
    percentual_gordura: toDecimal(formData.get("percentual_gordura")),
    massa_muscular: toDecimal(formData.get("massa_muscular")),
    agua_corporal: toDecimal(formData.get("agua_corporal")),
    historico_clinico: (formData.get("historico_clinico") as string) || null,
    alergias: (formData.get("alergias") as string) || null,
    medicamentos: (formData.get("medicamentos") as string) || null,
    suplementos: (formData.get("suplementos") as string) || null,
    habitos_alimentares: (formData.get("habitos_alimentares") as string) || null,
    observacoes: (formData.get("observacoes") as string) || null,
  };
}

async function upsertAnamnese(pacienteId: string, dados: ReturnType<typeof parseFormData>) {
  const existente = await prisma.anamneses.findFirst({
    where: { paciente_id: pacienteId },
  });

  if (existente) {
    await prisma.anamneses.update({
      where: { id: existente.id },
      data: dados,
    });
  } else {
    await prisma.anamneses.create({
      data: { paciente_id: pacienteId, ...dados },
    });
  }

  revalidatePath(`/pacientes/${pacienteId}/anamnese`);
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function salvarAnamnese(
  pacienteId: string,
  formData: FormData
) {
  const dados = parseFormData(formData);
  await upsertAnamnese(pacienteId, dados);
  redirect(`/pacientes/${pacienteId}/anamnese`);
}

export async function autoSalvarAnamnese(
  pacienteId: string,
  formData: FormData
) {
  const dados = parseFormData(formData);
  await upsertAnamnese(pacienteId, dados);
}

type ResultadoAntropometria = {
  massa_muscular?: number | null;
  percentual_gordura?: number | null;
  agua_corporal?: number | null;
};

// Liga os resultados da Antropometria às barras da Anamnese.
// Regra: o primeiro valor vence. Só preenche um campo se ele ainda
// estiver vazio na Anamnese, preservando qualquer valor editado pelo nutri.
export async function sincronizarAntropometria(
  pacienteId: string,
  resultado: ResultadoAntropometria
) {
  const existente = await prisma.anamneses.findFirst({
    where: { paciente_id: pacienteId },
  });

  const isEmpty = (valor: unknown) =>
    valor === null || valor === undefined || valor === "";

  const limpar = (valor: number | null | undefined) => {
    if (valor === null || valor === undefined) return null;
    if (Number.isNaN(valor)) return null;
    return valor;
  };

  const patch: ResultadoAntropometria = {};

  if (isEmpty(existente?.massa_muscular) && limpar(resultado.massa_muscular) !== null) {
    patch.massa_muscular = limpar(resultado.massa_muscular);
  }
  if (isEmpty(existente?.percentual_gordura) && limpar(resultado.percentual_gordura) !== null) {
    patch.percentual_gordura = limpar(resultado.percentual_gordura);
  }
  if (isEmpty(existente?.agua_corporal) && limpar(resultado.agua_corporal) !== null) {
    patch.agua_corporal = limpar(resultado.agua_corporal);
  }

  if (Object.keys(patch).length === 0) return; // nada novo -> mantem como esta

  if (existente) {
    await prisma.anamneses.update({
      where: { id: existente.id },
      data: patch,
    });
  } else {
    await prisma.anamneses.create({
      data: { paciente_id: pacienteId, ...patch },
    });
  }

  revalidatePath(`/pacientes/${pacienteId}/anamnese`);
  revalidatePath(`/pacientes/${pacienteId}/gasto-calorico`);
  revalidatePath(`/pacientes/${pacienteId}`);
}
