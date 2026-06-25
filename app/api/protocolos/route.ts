import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const nutricionistaId = (session.user as { id?: string }).id;
  if (!nutricionistaId) {
    return NextResponse.json({ error: "ID do nutricionista não encontrado" }, { status: 401 });
  }

  const protocolos = await prisma.protocolos.findMany({
    where: { nutricionista_id: nutricionistaId },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(
    protocolos.map((p) => ({
      id: p.id,
      name: p.nome,
      content: p.conteudo,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const nutricionistaId = (session.user as { id?: string }).id;
  if (!nutricionistaId) {
    return NextResponse.json({ error: "ID do nutricionista não encontrado" }, { status: 401 });
  }

  const body = await req.json();
  const { name, content } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }

  const protocolo = await prisma.protocolos.create({
    data: {
      nutricionista_id: nutricionistaId,
      nome: name.trim(),
      conteudo: content?.trim() ?? "",
    },
  });

  return NextResponse.json({
    id: protocolo.id,
    name: protocolo.nome,
    content: protocolo.conteudo,
  });
}
