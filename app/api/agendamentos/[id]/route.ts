import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { horario, tipo, status, observacoes, data_agendamento } = body;

    const updateData: Record<string, unknown> = {};
    if (horario !== undefined) {
      updateData.horario = new Date(`1970-01-01T${horario}:00.000Z`);
    }
    if (tipo !== undefined) updateData.tipo = tipo;
    if (status !== undefined) updateData.status = status;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (data_agendamento !== undefined) {
      const [datePart] = data_agendamento.split("T");
      updateData.data_agendamento = new Date(datePart + "T00:00:00.000Z");
    }

    const updated = await prisma.agendamentos.update({
      where: { id },
      data: updateData,
      include: {
        pacientes: { select: { id: true, nome: true, email: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      paciente_id: updated.paciente_id,
      paciente_nome: updated.pacientes.nome,
      paciente_email: updated.pacientes.email ?? "",
      data_agendamento: updated.data_agendamento.toISOString(),
      horario: updated.horario.toISOString(),
      tipo: updated.tipo ?? "Consulta inicial",
      status: updated.status ?? "Pendente",
      observacoes: updated.observacoes ?? "",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.agendamentos.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao excluir agendamento" }, { status: 500 });
  }
}
