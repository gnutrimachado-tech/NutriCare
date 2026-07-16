import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const nutricionistaId = (session.user as { id?: string }).id;
  if (!nutricionistaId) return NextResponse.json({ error: "ID não encontrado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dataParam = searchParams.get("data");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  try {
    type WhereClause = {
      data_agendamento?: Date | { gte: Date; lte: Date };
      pacientes?: { nutricionista_id: string };
    };
    const where: WhereClause = {
      pacientes: { nutricionista_id: nutricionistaId },
    };

    if (dataParam) {
      where.data_agendamento = new Date(dataParam + "T00:00:00.000Z");
    } else if (dataInicio && dataFim) {
      where.data_agendamento = {
        gte: new Date(dataInicio + "T00:00:00.000Z"),
        lte: new Date(dataFim + "T23:59:59.000Z"),
      };
    }

    const agendamentos = await prisma.agendamentos.findMany({
      where,
      include: {
        pacientes: {
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: [{ data_agendamento: "asc" }, { horario: "asc" }],
    });

    const result = agendamentos.map((a) => ({
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

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { paciente_id, data_agendamento, horario, tipo, observacoes } = body;

    if (!paciente_id || !data_agendamento || !horario) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const datePart = data_agendamento.split("T")[0];
    const dataDate = new Date(datePart + "T00:00:00.000Z");
    const horarioDate = new Date(`1970-01-01T${horario}:00.000Z`);

    const agendamento = await prisma.agendamentos.create({
      data: {
        paciente_id,
        data_agendamento: dataDate,
        horario: horarioDate,
        tipo: tipo || "Consulta inicial",
        status: "Pendente",
        observacoes: observacoes || null,
        confirmation_token: token,
        email_enviado: false,
      },
      include: {
        pacientes: { select: { id: true, nome: true, email: true } },
      },
    });

    return NextResponse.json({
      id: agendamento.id,
      paciente_id: agendamento.paciente_id,
      paciente_nome: agendamento.pacientes.nome,
      paciente_email: agendamento.pacientes.email ?? "",
      data_agendamento: agendamento.data_agendamento.toISOString(),
      horario: agendamento.horario.toISOString(),
      tipo: agendamento.tipo ?? "Consulta inicial",
      status: agendamento.status ?? "Pendente",
      observacoes: agendamento.observacoes ?? "",
      email_enviado: agendamento.email_enviado ?? false,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
