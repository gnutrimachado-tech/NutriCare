import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const acao = searchParams.get("acao"); // "confirmar" ou "recusar"

  if (!token || !acao) {
    return new NextResponse(htmlPage("Erro", "Link inválido.", "#dc2626"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const agendamento = await prisma.agendamentos.findUnique({
      where: { confirmation_token: token },
      include: { pacientes: { select: { nome: true } } },
    });

    if (!agendamento) {
      return new NextResponse(
        htmlPage("Não encontrado", "Este link de confirmação não é válido ou já foi processado.", "#d97706"),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const novoStatus = acao === "confirmar" ? "Confirmado" : "Recusado";

    await prisma.agendamentos.update({
      where: { id: agendamento.id },
      data: { status: novoStatus },
    });

    const dataFormatada = new Date(agendamento.data_agendamento).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const horarioFormatado = new Date(agendamento.horario).toLocaleTimeString("pt-BR", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    });

    const cor = novoStatus === "Confirmado" ? "#16a34a" : "#dc2626";
    const titulo = novoStatus === "Confirmado" ? "✅ Consulta Confirmada!" : "❌ Consulta Recusada";
    const mensagem =
      novoStatus === "Confirmado"
        ? `Sua consulta em ${dataFormatada} às ${horarioFormatado} foi confirmada com sucesso. Até lá!`
        : `Sua consulta em ${dataFormatada} às ${horarioFormatado} foi recusada. Entre em contato com o nutricionista para reagendar.`;

    return new NextResponse(htmlPage(titulo, mensagem, cor), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse(
      htmlPage("Erro", "Ocorreu um erro ao processar sua resposta. Tente novamente.", "#dc2626"),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function htmlPage(titulo: string, mensagem: string, cor: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo} — NutriCare</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 40px 36px; max-width: 480px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.10); text-align: center; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; color: ${cor}; margin-bottom: 12px; }
    p { font-size: 15px; color: #475569; line-height: 1.7; }
    .brand { margin-top: 32px; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${cor === "#16a34a" ? "✅" : cor === "#dc2626" ? "❌" : "⚠️"}</div>
    <h1>${titulo}</h1>
    <p>${mensagem}</p>
    <div class="brand">NutriCare — Sistema de Nutrição</div>
  </div>
</body>
</html>`;
}
