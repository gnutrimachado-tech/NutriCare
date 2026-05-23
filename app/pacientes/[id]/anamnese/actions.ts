"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function salvarAnamnese(
  pacienteId: string,
  formData: FormData
) {
  const toDecimal = (valor: FormDataEntryValue | null) => {
    const texto = String(valor || "").replace(",", ".").trim();
    if (!texto) return null;

    const numero = Number(texto);
    if (Number.isNaN(numero)) return null;

    return numero;
  };

  const dados = {
    peso: toDecimal(formData.get("peso")),
    altura: toDecimal(formData.get("altura")),
    imc: toDecimal(formData.get("imc")),
    percentual_gordura: toDecimal(
      formData.get("percentual_gordura")
    ),
    massa_muscular: toDecimal(
      formData.get("massa_muscular")
    ),
    agua_corporal: toDecimal(
      formData.get("agua_corporal")
    ),
    taxa_metabolica: toDecimal(
      formData.get("taxa_metabolica")
    ),

    historico_clinico:
      (formData.get("historico_clinico") as string) ||
      null,
    alergias:
      (formData.get("alergias") as string) || null,
    medicamentos:
      (formData.get("medicamentos") as string) ||
      null,
    suplementos:
      (formData.get("suplementos") as string) ||
      null,
    habitos_alimentares:
      (formData.get("habitos_alimentares") as string) ||
      null,
    observacoes:
      (formData.get("observacoes") as string) ||
      null,
  };

  const existente = await prisma.anamneses.findFirst({
    where: {
      paciente_id: pacienteId,
    },
  });

  if (existente) {
    await prisma.anamneses.update({
      where: {
        id: existente.id,
      },
      data: dados,
    });
  } else {
    await prisma.anamneses.create({
      data: {
        paciente_id: pacienteId,
        ...dados,
      },
    });
  }

  revalidatePath(`/pacientes/${pacienteId}/anamnese`);
  revalidatePath(`/pacientes/${pacienteId}`);

  // Retorna para a própria página da anamnese
  redirect(`/pacientes/${pacienteId}/anamnese`);
}