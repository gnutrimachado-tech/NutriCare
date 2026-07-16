"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function criarPaciente(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const nutricionistaId = (session.user as { id?: string }).id;
  if (!nutricionistaId) throw new Error("ID do nutricionista não encontrado.");

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

  await prisma.pacientes.create({
    data: {
      nutricionista_id: nutricionistaId,
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      data_nascimento: dataNascimento ? new Date(dataNascimento) : null,
      sexo: sexo.trim() || null,
      profissao: profissao.trim() || null,
      estado_civil: estadoCivil.trim() || null,
      objetivo: objetivo.trim() || null,
      observacoes: observacoes.trim() || null,
    },
  });

  revalidatePath("/pacientes");
}
