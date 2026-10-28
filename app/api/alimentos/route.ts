import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AlimentoInput = {
  nome?: unknown;
  calorias?: unknown;
  proteinas?: unknown;
  carboidratos?: unknown;
  gorduras?: unknown;
  fibras?: unknown;
};

function toNonNegativeNumber(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 999999.99) return null;
  return Math.round(parsed * 100) / 100;
}

function toClientFood(food: {
  nome: string;
  calorias: { toNumber(): number } | null;
  proteinas: { toNumber(): number } | null;
  carboidratos: { toNumber(): number } | null;
  gorduras: { toNumber(): number } | null;
  fibras: { toNumber(): number } | null;
}) {
  return {
    n: food.nome,
    k: food.calorias?.toNumber() ?? 0,
    p: food.proteinas?.toNumber() ?? 0,
    c: food.carboidratos?.toNumber() ?? 0,
    l: food.gorduras?.toNumber() ?? 0,
    f: food.fibras?.toNumber() ?? 0,
    ca: 0,
    fe: 0,
  };
}

async function getNutricionistaId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  const nutricionistaId = await getNutricionistaId();
  if (!nutricionistaId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const foods = await prisma.alimentos.findMany({
      where: { nutricionista_id: nutricionistaId },
      select: {
        nome: true,
        calorias: true,
        proteinas: true,
        carboidratos: true,
        gorduras: true,
        fibras: true,
      },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(foods.map(toClientFood));
  } catch (error) {
    console.error("Erro ao carregar alimentos personalizados:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os alimentos. Verifique se a migração SQL foi aplicada no Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const nutricionistaId = await getNutricionistaId();
  if (!nutricionistaId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  const body = payload as AlimentoInput;

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  if (!nome || nome.length > 200) {
    return NextResponse.json(
      { error: "Informe o nome do alimento (máximo de 200 caracteres)." },
      { status: 400 }
    );
  }

  const calorias = toNonNegativeNumber(body.calorias);
  const proteinas = toNonNegativeNumber(body.proteinas);
  const carboidratos = toNonNegativeNumber(body.carboidratos);
  const gorduras = toNonNegativeNumber(body.gorduras);
  const fibras = body.fibras === undefined ? 0 : toNonNegativeNumber(body.fibras);

  if ([calorias, proteinas, carboidratos, gorduras, fibras].some((value) => value === null)) {
    return NextResponse.json(
      { error: "Calorias, proteínas, carboidratos, gorduras e fibras devem ser números iguais ou maiores que zero." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.alimentos.findFirst({
      where: {
        nutricionista_id: nutricionistaId,
        nome: { equals: nome, mode: "insensitive" },
      },
      select: { id: true },
    });

    const values = {
      nome,
      categoria: "Personalizado",
      calorias: calorias!,
      proteinas: proteinas!,
      carboidratos: carboidratos!,
      gorduras: gorduras!,
      fibras: fibras!,
    };

    const savedFood = existing
      ? await prisma.alimentos.update({
          where: { id: existing.id },
          data: values,
          select: {
            nome: true,
            calorias: true,
            proteinas: true,
            carboidratos: true,
            gorduras: true,
            fibras: true,
          },
        })
      : await prisma.alimentos.create({
          data: { ...values, nutricionista_id: nutricionistaId },
          select: {
            nome: true,
            calorias: true,
            proteinas: true,
            carboidratos: true,
            gorduras: true,
            fibras: true,
          },
        });

    return NextResponse.json(toClientFood(savedFood), { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Erro ao salvar alimento personalizado:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar o alimento. Verifique a conexão com o Neon e se a migração SQL foi aplicada." },
      { status: 500 }
    );
  }
}
