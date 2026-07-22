import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/DashboardLayout";

export const dynamic = "force-dynamic";

function calcularIdade(dataNascimento: Date | null): number {
  if (!dataNascimento) return 0;
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const mesNascimento = nascimento.getMonth();
  const diaNascimento = nascimento.getDate();
  if (
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && diaAtual < diaNascimento)
  ) {
    idade--;
  }
  return idade;
}

export default async function DashboardPage() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

  // Fetch nutritionist (first one for now)
  const nutri = await prisma.nutricionistas.findFirst({
    orderBy: { created_at: "asc" },
  });

  // Count stats
  const totalPacientes = await prisma.pacientes.count();

  const novosPacientesMes = await prisma.pacientes.count({
    where: {
      created_at: { gte: inicioMes },
    },
  });

  const totalPlanos = await prisma.planos_alimentares.count();

  // Today's appointments
  const agendamentosHoje = await prisma.agendamentos.findMany({
    where: {
      data_agendamento: {
        gte: inicioHoje,
        lt: fimHoje,
      },
    },
    include: {
      pacientes: true,
    },
    orderBy: { horario: "asc" },
    take: 10,
  });

  const totalAgendamentosHoje = await prisma.agendamentos.count({
    where: {
      data_agendamento: {
        gte: inicioHoje,
        lt: fimHoje,
      },
    },
  });

  const realizadasHoje = await prisma.agendamentos.count({
    where: {
      data_agendamento: {
        gte: inicioHoje,
        lt: fimHoje,
      },
      status: { in: ["Confirmado", "Realizado", "Concluído"] },
    },
  });

  // Month consultations by type
  const agendamentosMes = await prisma.agendamentos.findMany({
    where: {
      data_agendamento: { gte: inicioMes },
    },
    select: { tipo: true },
  });

  const consultasPorTipo: Record<string, number> = {};
  for (const a of agendamentosMes) {
    const tipo = a.tipo || "Outro";
    consultasPorTipo[tipo] = (consultasPorTipo[tipo] || 0) + 1;
  }

  // Gender distribution
  const allPacientes = await prisma.pacientes.findMany({
    select: { sexo: true },
  });
  let feminino = 0;
  let masculino = 0;
  for (const p of allPacientes) {
    const s = (p.sexo || "").toLowerCase();
    if (s === "feminino" || s === "f") feminino++;
    else masculino++;
  }

  // Birthdays this month
  const todosPacientes = await prisma.pacientes.findMany({
    select: { id: true, nome: true, data_nascimento: true },
  });

  const mesAtual = hoje.getMonth();
  const aniversariantes = todosPacientes
    .filter((p) => p.data_nascimento && new Date(p.data_nascimento).getMonth() === mesAtual)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      idade: calcularIdade(p.data_nascimento),
      dia: p.data_nascimento
        ? `${String(new Date(p.data_nascimento).getDate()).padStart(2, "0")}/${String(new Date(p.data_nascimento).getMonth() + 1).padStart(2, "0")}`
        : "",
    }))
    .slice(0, 4);

  // Weekly consultations (last 5 weeks)
  const consultasPorSemana: { label: string; count: number }[] = [];
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(hoje);
    weekStart.setDate(hoje.getDate() - hoje.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const count = await prisma.agendamentos.count({
      where: {
        data_agendamento: { gte: weekStart, lt: weekEnd },
      },
    });
    const diaInicio = weekStart.getDate();
    const diaFim = new Date(weekEnd.getTime() - 86400000).getDate();
    const mes = weekStart.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
    consultasPorSemana.push({
      label: `${diaInicio}-${diaFim} ${mes.charAt(0).toUpperCase() + mes.slice(1)}`,
      count,
    });
  }

  // Patients follow-up (last appointment for each)
  const pacientesComAgendamento = await prisma.pacientes.findMany({
    include: {
      agendamentos: {
        orderBy: { data_agendamento: "desc" },
        take: 1,
      },
    },
    take: 10,
  });

  const pacientesAcompanhamento = pacientesComAgendamento.map((p) => {
    const ultimaConsulta = p.agendamentos[0];
    let statusLabel = "Inativo";
    let statusColor = "#94a3b8";
    let tempoLabel = "Sem consultas";

    if (ultimaConsulta) {
      const diffMs = hoje.getTime() - new Date(ultimaConsulta.data_agendamento).getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHoras < 24) {
        tempoLabel = `Última consulta há ${diffHoras} hora${diffHoras !== 1 ? "s" : ""}`;
        statusLabel = "Recente";
        statusColor = "#16a34a";
      } else if (diffDias <= 14) {
        tempoLabel = `Última consulta há ${diffDias} dia${diffDias !== 1 ? "s" : ""}`;
        statusLabel = "Atenção";
        statusColor = "#f59e0b";
      } else if (diffDias <= 60) {
        tempoLabel = `Última consulta há ${diffDias} dias`;
        statusLabel = "Sem retorno";
        statusColor = "#ef4444";
      } else {
        const meses = Math.floor(diffDias / 30);
        tempoLabel = `Última consulta há ${meses} mes${meses !== 1 ? "es" : ""}`;
        statusLabel = "Inativo";
        statusColor = "#94a3b8";
      }
    }

    return {
      id: p.id,
      nome: p.nome,
      tempoLabel,
      statusLabel,
      statusColor,
    };
  });

  // Format today's appointments for the layout
  const pacientesHoje = agendamentosHoje.map((a) => ({
    id: a.id,
    horario: new Date(a.horario).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    nome: a.pacientes.nome,
    idade: calcularIdade(a.pacientes.data_nascimento),
    consulta: a.tipo === "Avaliação" || a.tipo === "avaliação" ? "1ª Consulta" : (a.tipo || "Retorno"),
    status: a.status || "Agendado",
  }));

  const pendentes = totalAgendamentosHoje - realizadasHoje;

  return (
    <DashboardLayout
      nomeNutri={nutri?.nome || "Nutricionista"}
      totalPacientes={totalPacientes}
      novosPacientesMes={novosPacientesMes}
      totalPlanos={totalPlanos}
      pacientesHoje={pacientesHoje}
      totalAgendamentosHoje={totalAgendamentosHoje}
      realizadasHoje={realizadasHoje}
      pendentesHoje={pendentes}
      consultasPorTipo={consultasPorTipo}
      feminino={feminino}
      masculino={masculino}
      aniversariantes={aniversariantes}
      consultasPorSemana={consultasPorSemana}
      pacientesAcompanhamento={pacientesAcompanhamento}
    />
  );
}
