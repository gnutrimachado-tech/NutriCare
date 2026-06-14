"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function atualizarPaciente(
  id: string,
  formData: FormData
) {
  const dataNascimento = formData.get("data_nascimento") as string;

  await prisma.pacientes.update({
    where: {
      id,
    },
    data: {
      nome: formData.get("nome") as string,
      email: (formData.get("email") as string) || null,
      telefone: (formData.get("telefone") as string) || null,
      data_nascimento: dataNascimento
        ? new Date(dataNascimento)
        : null,
      sexo: (formData.get("sexo") as string) || null,
      profissao: (formData.get("profissao") as string) || null,
      estado_civil:
        (formData.get("estado_civil") as string) || null,
      objetivo: (formData.get("objetivo") as string) || null,
      observacoes:
        (formData.get("observacoes") as string) || null,
      updated_at: new Date(),
    },
  });

  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/pacientes");

  // Permanece na página atual
  redirect(`/pacientes/${id}`);
}

export async function excluirPaciente(id: string) {
  await prisma.pacientes.delete({
    where: {
      id,
    },
  });

  revalidatePath("/pacientes");

  // Após excluir, volta para a lista
  redirect("/pacientes");
}
