"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function converterNumero(valor: string | null): number | null {
  if (!valor || valor.trim() === "") return null;

  const convertido = Number(valor.replace(",", "."));

  if (isNaN(convertido)) return null;

  return convertido;
}

export async function salvarAntropometria(
  pacienteId: string,
  formData: FormData
) {
  const dados = {
    peso: converterNumero(formData.get("peso") as string),
    percentual_gordura: converterNumero(
      formData.get("percentual_gordura") as string
    ),
    massa_muscular: converterNumero(
      formData.get("massa_muscular") as string
    ),
    circunferencia_abdominal: converterNumero(
      formData.get("circunferencia_abdominal") as string
    ),
    observacoes:
      (formData.get("observacoes") as string)?.trim() || null,
  };

  await prisma.evolucao_corporal.create({
    data: {
      paciente_id: pacienteId,
      ...dados,
    },
  });

  const anamnese = await prisma.anamneses.findFirst({
    where: {
      paciente_id: pacienteId,
    },
  });

  if (anamnese) {
    await prisma.anamneses.update({
      where: {
        id: anamnese.id,
      },
      data: {
        peso: dados.peso,
        percentual_gordura: dados.percentual_gordura,
        massa_muscular: dados.massa_muscular,
      },
    });
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath(`/pacientes/${pacienteId}/anamnese`);
  revalidatePath(`/pacientes/${pacienteId}/antropometria`);

  redirect(`/pacientes/${pacienteId}/anamnese`);
}
