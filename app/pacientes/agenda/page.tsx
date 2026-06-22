import { prisma } from "@/lib/prisma";
import AgendaClient from "./AgendaClient";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const pacientes = await prisma.pacientes.findMany({
    select: { id: true, nome: true, email: true },
    orderBy: { nome: "asc" },
  });

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const agendamentos = await prisma.agendamentos.findMany({
    where: {
      data_agendamento: { gte: inicioMes, lte: fimMes },
    },
    include: {
      pacientes: { select: { id: true, nome: true, email: true } },
    },
    orderBy: { horario: "asc" },
  });

  const pacientesSerial = pacientes.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email ?? "",
  }));

  const agendamentosSerial = agendamentos.map((a) => ({
    id: a.id,
    paciente_id: a.paciente_id,
    paciente_nome: a.pacientes.nome,
    paciente_email: a.pacientes.email ?? "",
    data_agendamento: a.data_agendamento.toISOString(),
    horario: a.horario.toISOString(),
    tipo: a.tipo ?? "Consulta inicial",
    status: a.status ?? "Pendente",
    observacoes: a.observacoes ?? "",
    email_enviado: a.email_enviado ?? false,
  }));

  return (
    <AgendaClient
      pacientes={pacientesSerial}
      agendamentosIniciais={agendamentosSerial}
    />
  );
}
