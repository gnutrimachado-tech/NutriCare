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

export type AvaliacaoAntropometricaInput = {
  dataAvaliacao: string;
  peso: number;
  percentualGordura: number | null;
  massaMuscular: number | null;
  dobras: Record<string, number | null>;
  circunferencias: Record<string, number | null>;
  protocoloId?: string | null;
};

function dataAvaliacaoValida(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Informe uma data de avaliação válida.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Informe uma data de avaliação válida.");
  }
  return date;
}

export async function salvarAvaliacaoAntropometrica(
  pacienteId: string,
  input: AvaliacaoAntropometricaInput
) {
  const dataAvaliacao = dataAvaliacaoValida(input.dataAvaliacao);

  // O schema de `evolucao_corporal` não possui colunas dobras_json /
  // circunferencias_json / protocolo_id. Essas medidas são preservadas no
  // snapshot dentro de `observacoes` (mesmo padrão de lib/avaliacaoHistorico).
  // Regra solicitada: se já existir avaliação na MESMA data, atualiza os
  // valores do registro existente em vez de criar uma nova avaliação.
  const observacoesSnapshot = JSON.stringify({
    tipo: "avaliacao_antropometrica",
    snapshot: {
      dataAvaliacao: input.dataAvaliacao,
      protocoloId: input.protocoloId || null,
      dobras: input.dobras,
      circunferencias: input.circunferencias,
    },
  });

  const inicioDoDia = new Date(`${input.dataAvaliacao}T00:00:00.000Z`);
  const fimDoDia = new Date(`${input.dataAvaliacao}T23:59:59.999Z`);
  const existente = await prisma.evolucao_corporal.findFirst({
    where: {
      paciente_id: pacienteId,
      data_avaliacao: { gte: inicioDoDia, lte: fimDoDia },
    },
    orderBy: { created_at: "desc" },
  });

  const saved = existente
    ? await prisma.evolucao_corporal.update({
        where: { id: existente.id },
        data: {
          peso: input.peso,
          percentual_gordura: input.percentualGordura,
          massa_muscular: input.massaMuscular,
          observacoes: observacoesSnapshot,
        },
      })
    : await prisma.evolucao_corporal.create({
        data: {
          paciente_id: pacienteId,
          data_avaliacao: dataAvaliacao,
          peso: input.peso,
          percentual_gordura: input.percentualGordura,
          massa_muscular: input.massaMuscular,
          observacoes: observacoesSnapshot,
        },
      });

  const registros = await prisma.evolucao_corporal.findMany({
    where: { paciente_id: pacienteId },
    orderBy: [{ data_avaliacao: "asc" }, { created_at: "asc" }],
    select: { id: true },
  });

  const antigos = registros.slice(0, Math.max(0, registros.length - 3)).map((item) => item.id);
  if (antigos.length > 0) {
    await prisma.evolucao_corporal.deleteMany({
      where: { paciente_id: pacienteId, id: { in: antigos } },
    });
  }

  const anamnese = await prisma.anamneses.findFirst({
    where: { paciente_id: pacienteId },
  });

  if (anamnese) {
    await prisma.anamneses.update({
      where: { id: anamnese.id },
      data: {
        peso: input.peso,
        percentual_gordura: input.percentualGordura,
        massa_muscular: input.massaMuscular,
      },
    });
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath(`/pacientes/${pacienteId}/anamnese`);
  revalidatePath(`/pacientes/${pacienteId}/antropometria`);

  return {
    id: saved.id,
    dataAvaliacao: saved.data_avaliacao?.toISOString() ?? input.dataAvaliacao,
    createdAt: saved.created_at?.toISOString() ?? "",
    peso: saved.peso === null ? null : Number(saved.peso),
    percentualGordura:
      saved.percentual_gordura === null ? null : Number(saved.percentual_gordura),
    massaMuscular: saved.massa_muscular === null ? null : Number(saved.massa_muscular),
    dobras: input.dobras,
    circunferencias: input.circunferencias,
    protocoloId: input.protocoloId || null,
  };
}

export async function excluirAvaliacaoAntropometrica(
  pacienteId: string,
  avaliacaoId: string
) {
  await prisma.evolucao_corporal.deleteMany({
    where: { id: avaliacaoId, paciente_id: pacienteId },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath(`/pacientes/${pacienteId}/anamnese`);
  revalidatePath(`/pacientes/${pacienteId}/antropometria`);
}
