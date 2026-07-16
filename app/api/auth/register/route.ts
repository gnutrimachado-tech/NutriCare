import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { nome, email, senha, telefone, crn } = await request.json();

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const existente = await prisma.nutricionistas.findUnique({
      where: { email },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 409 }
      );
    }

    const senha_hash = await hash(senha, 12);

    await prisma.nutricionistas.create({
      data: {
        nome,
        email,
        senha_hash,
        telefone: telefone || null,
        crn: crn || null,
      },
    });

    return NextResponse.json({ message: "Cadastro realizado com sucesso!" });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao realizar cadastro." },
      { status: 500 }
    );
  }
}
