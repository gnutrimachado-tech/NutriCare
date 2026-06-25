import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const nutricionistaId = (session.user as { id?: string }).id;
  const { id } = await params;

  const body = await req.json();
  const { name, content } = body;

  const existing = await prisma.protocolos.findUnique({ where: { id } });
  if (!existing || existing.nutricionista_id !== nutricionistaId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const updated = await prisma.protocolos.update({
    where: { id },
    data: {
      nome: name?.trim() ?? existing.nome,
      conteudo: content?.trim() ?? existing.conteudo,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.nome,
    content: updated.conteudo,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const nutricionistaId = (session.user as { id?: string }).id;
  const { id } = await params;

  const existing = await prisma.protocolos.findUnique({ where: { id } });
  if (!existing || existing.nutricionista_id !== nutricionistaId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.protocolos.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
