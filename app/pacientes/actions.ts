"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function criarPaciente(formData: FormData) {
  const nome = String(formData.get("nome") || "");
  const email = String(formData.get("email") || "");
  const telefone = String(formData.get("telefone") || "");
  const dataNascimento = String(formData.get("data_nascimento") || "");
  const sexo = String(formData.get("sexo") || "");
  const profissao = String(formData.get("profissao") || "");
  const estadoCivil = String(formData.get("estado_civil") || "");
  const objetivo = String(formData.get("objetivo") || "");
  const observacoes = String(formData.get("observacoes") || "");

  if (!nome.trim()) {
    throw new Error("O nome é obrigatório.");
  }

  const nutricionista = await prisma.nutricionistas.findFirst();

  if (!nutricionista) {
    throw new Error("Nenhum nutricionista cadastrado na base.");
  }

  await prisma.pacientes.create({
    data: {
      nutricionista_id: nutricionista.id,
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      data_nascimento: dataNascimento
        ? new Date(dataNascimento)
        : null,
      sexo: sexo.trim() || null,
      profissao: profissao.trim() || null,
      estado_civil: estadoCivil.trim() || null,
      objetivo: objetivo.trim() || null,
      observacoes: observacoes.trim() || null,
    },
  });

  revalidatePath("/pacientes");
}