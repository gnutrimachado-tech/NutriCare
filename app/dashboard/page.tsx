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

  // ── Performance: rodar todas as queries independentes em paralelo ──
  const [
    nutri,
    totalPacientes,
    novosPacientesMes,
    totalPlanos,
    agendamentosHoje,
    totalAgendamentosHoje,
    realizadasHoje,
    agendamentosMes,
    allPacientes,
    todosPacientes,
    pacientesComAgendamento,
    formTokensRecentes,
    agendamentosRecentes,
  ] = await Promise.all([
    prisma.nutricionistas.findFirst({ orderBy: { created_at: "asc" } }),
    prisma.pacientes.count(),
    prisma.pacientes.count({ where: { created_at: { gte: inicioMes } } }),
    prisma.planos_alimentares.count(),
    prisma.agendamentos.findMany({
      where: { data_agendamento: { gte: inicioHoje, lt: fimHoje } },
      include: { pacientes: true },
      orderBy: { horario: "asc" },
      take: 10,
    }),
    prisma.agendamentos.count({
      where: { data_agendamento: { gte: inicioHoje, lt: fimHoje } },
    }),
    prisma.agendamentos.count({
      where: {
        data_agendamento: { gte: inicioHoje, lt: fimHoje },
        status: { in: ["Confirmado", "Realizado", "Concluído"] },
      },
    }),
    prisma.agendamentos.findMany({
      where: { data_agendamento: { gte: inicioMes } },
      select: { tipo: true },
    }),
    prisma.pacientes.findMany({ select: { sexo: true } }),
    prisma.pacientes.findMany({
      select: { id: true, nome: true, data_nascimento: true },
    }),
    prisma.pacientes.findMany({
      include: {
        agendamentos: { orderBy: { data_agendamento: "desc" }, take: 1 },
      },
      take: 10,
    }),
    // Formulários pendentes/respondidos (últimos 20)
    prisma.formulario_tokens.findMany({
      where: { OR: [{ status: "pendente" }, { status: "respondido" }] },
      include: { pacientes: { select: { id: true, nome: true } } },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    // Agendamentos pendentes/confirmados/recusados (últimos 20)
    prisma.agendamentos.findMany({
      where: {
        status: { in: ["Agendado", "Confirmado", "Recusado"] },
      },
      include: { pacientes: { select: { id: true, nome: true } } },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
  ]);

  // ── Processar consultas por tipo ──
  const consultasPorTipo: Record<string, number> = {};
  for (const a of agendamentosMes) {
    const tipo = a.tipo || "Outro";
    consultasPorTipo[tipo] = (consultasPorTipo[tipo] || 0) + 1;
  }

  // ── Distribuição por gênero ──
  let feminino = 0;
  let masculino = 0;
  for (const p of allPacientes) {
    const s = (p.sexo || "").toLowerCase();
    if (s === "feminino" || s === "f") feminino++;
    else masculino++;
  }

  // ── Aniversariantes do mês ──
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

  // ── Consultas por semana (últimas 5 semanas) em paralelo ──
  const weekRanges: { start: Date; end: Date }[] = [];
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(hoje);
    weekStart.setDate(hoje.getDate() - hoje.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekRanges.push({ start: weekStart, end: weekEnd });
  }

  const weekCounts = await Promise.all(
    weekRanges.map(({ start, end }) =>
      prisma.agendamentos.count({
        where: { data_agendamento: { gte: start, lt: end } },
      })
    )
  );

  const consultasPorSemana: { label: string; count: number }[] = weekRanges.map(
    ({ start, end }, i) => {
      const diaInicio = start.getDate();
      const diaFim = new Date(end.getTime() - 86400000).getDate();
      const mes = start.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
      return {
        label: `${diaInicio}-${diaFim} ${mes.charAt(0).toUpperCase() + mes.slice(1)}`,
        count: weekCounts[i],
      };
    }
  );

  // ── Pacientes em acompanhamento ──
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

  // ── Consultas de hoje ──
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

  // ── Status de formulário/consulta por paciente ──
  // Agrupar por paciente: junta dados de formulario_tokens e agendamentos
  const statusMap = new Map<string, {
    nome: string;
    formularioStatus: "pendente" | "respondido" | "expirado";
    consultaStatus: "pendente" | "confirmado" | "recusado" | "nenhum";
  }>();

  // Processar formulários
  for (const ft of formTokensRecentes) {
    const pid = ft.pacientes?.id;
    if (!pid) continue;
    const existing = statusMap.get(pid);
    // Determinar status do formulário (expirado se passou expires_at e ainda pendente)
    let formSt: "pendente" | "respondido" | "expirado" = "pendente";
    if (ft.status === "respondido") {
      formSt = "respondido";
    } else if (ft.expires_at && new Date(ft.expires_at) < hoje) {
      formSt = "expirado";
    }
    // Manter o status mais prioritário (respondido > expirado > pendente)
    if (!existing || (existing.formularioStatus !== "respondido" && formSt === "respondido")) {
      statusMap.set(pid, {
        nome: ft.pacientes.nome,
        formularioStatus: formSt,
        consultaStatus: existing?.consultaStatus || "nenhum",
      });
    } else if (existing && formSt === "expirado" && existing.formularioStatus === "pendente") {
      existing.formularioStatus = "expirado";
    }
  }

  // Processar agendamentos
  for (const ag of agendamentosRecentes) {
    const pid = ag.pacientes?.id;
    if (!pid) continue;
    const existing = statusMap.get(pid);
    let consSt: "pendente" | "confirmado" | "recusado" | "nenhum" = "nenhum";
    if (ag.status === "Confirmado") consSt = "confirmado";
    else if (ag.status === "Recusado") consSt = "recusado";
    else if (ag.status === "Agendado") consSt = "pendente";

    if (!existing) {
      statusMap.set(pid, {
        nome: ag.pacientes.nome,
        formularioStatus: "nenhum" as "pendente",
        consultaStatus: consSt,
      });
    } else {
      // Manter o status mais prioritário (confirmado > pendente > recusado > nenhum)
      if (consSt === "confirmado" || existing.consultaStatus === "nenhum") {
        existing.consultaStatus = consSt;
      }
    }
  }

  // Converter para array, limitar a 10
  const statusPacientes = Array.from(statusMap.values())
    .slice(0, 10)
    .map((s, i) => ({
      id: `status-${i}`,
      nome: s.nome,
      formularioStatus: s.formularioStatus,
      consultaStatus: s.consultaStatus,
    }));

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
      statusPacientes={statusPacientes}
    />
  );
}
