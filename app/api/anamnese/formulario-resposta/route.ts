import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { token, respostas } = await request.json();

    if (!token || !respostas) {
      return NextResponse.json(
        { error: "Token e respostas são obrigatórios." },
        { status: 400 }
      );
    }

    const formulario = await prisma.formulario_tokens.findUnique({
      where: { token },
      include: { pacientes: true },
    });

    if (!formulario) {
      return NextResponse.json({ error: "Link inválido." }, { status: 404 });
    }

    if (formulario.status === "respondido") {
      return NextResponse.json(
        { error: "Este formulário já foi respondido." },
        { status: 409 }
      );
    }

    if (new Date() > formulario.expires_at) {
      return NextResponse.json({ error: "Este link expirou." }, { status: 410 });
    }

    const toDecimal = (valor: unknown) => {
      const texto = String(valor || "").replace(",", ".").trim();
      if (!texto) return null;
      const numero = Number(texto);
      if (isNaN(numero)) return null;
      return numero;
    };

    const dados: Record<string, unknown> = {};
    for (const campo of formulario.campos) {
      const valor = respostas[campo];
      const numericos = ["peso", "altura", "percentual_gordura", "massa_muscular", "massa_adiposa", "agua_corporal"];
      if (numericos.includes(campo)) {
        dados[campo] = toDecimal(valor);
      } else {
        dados[campo] = valor || null;
      }
    }

    const existente = await prisma.anamneses.findFirst({
      where: { paciente_id: formulario.paciente_id },
    });

    if (existente) {
      await prisma.anamneses.update({
        where: { id: existente.id },
        data: dados,
      });
    } else {
      await prisma.anamneses.create({
        data: {
          paciente_id: formulario.paciente_id,
          ...dados,
        },
      });
    }

    await prisma.formulario_tokens.update({
      where: { id: formulario.id },
      data: { status: "respondido" },
    });

    return NextResponse.json({ message: "Respostas salvas com sucesso!" });
  } catch (err) {
    console.error("Erro formulario-resposta:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token obrigatório." }, { status: 400 });
  }

  const formulario = await prisma.formulario_tokens.findUnique({
    where: { token },
    include: { pacientes: { select: { nome: true, email: true } } },
  });

  if (!formulario) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }

  if (new Date() > formulario.expires_at) {
    return NextResponse.json({ error: "Link expirado." }, { status: 410 });
  }

  return NextResponse.json({
    campos: formulario.campos,
    pacienteNome: formulario.pacientes.nome,
    status: formulario.status,
  });
}
