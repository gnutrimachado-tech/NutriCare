import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { pacienteId, campos } = await request.json();

    if (!pacienteId || !campos || campos.length === 0) {
      return NextResponse.json(
        { error: "pacienteId e campos são obrigatórios." },
        { status: 400 }
      );
    }

    const paciente = await prisma.pacientes.findUnique({
      where: { id: pacienteId },
    });

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    if (!paciente.email) {
      return NextResponse.json(
        { error: "Este paciente não tem e-mail cadastrado." },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.formulario_tokens.create({
      data: {
        paciente_id: pacienteId,
        token,
        campos,
        expires_at: expiresAt,
      },
    });

    // ── URL pública: nunca usa localhost em produção ──
    // Prioridade: NEXT_PUBLIC_APP_URL → NEXTAUTH_URL → VERCEL_URL → Origin do request → localhost (último recurso)
    const originHeader = request.headers.get("origin") || request.headers.get("referer") || "";
    let originHost = "";
    try {
      if (originHeader) originHost = new URL(originHeader).origin;
    } catch { /* ignore */ }

    const rawBase =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      originHost ||
      "http://localhost:3000";

    const baseUrl = rawBase.replace(/\/+$/, "");
    const linkFormulario = `${baseUrl}/formulario-paciente/${token}`;

    const logoUrl = `${baseUrl}/logo-nutricare.png`;

    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(180deg, #3f6faa 0%, #265d99 45%, #183865 100%); padding: 32px; text-align: center;">
          <img src="${logoUrl}" alt="NutriCare" style="display:block; margin:0 auto 10px; max-width:200px; height:auto;" />
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 12px; letter-spacing: 2px;">CIÊNCIA · NUTRIÇÃO · BEM-ESTAR</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #183865; margin-top: 0;">Olá, ${paciente.nome.split(" ")[0]}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Seu nutricionista enviou um formulário de anamnese para você preencher. 
            Por favor, clique no botão abaixo para responder às perguntas.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkFormulario}" 
               style="background: linear-gradient(135deg, #3f6faa, #183865); color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; letter-spacing: 1px;">
              Responder Formulário
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
            Este link é válido por 7 dias. Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
            <a href="${linkFormulario}" style="color: #3f6faa; word-break: break-all;">${linkFormulario}</a>
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            NutriCare — Sistema Profissional para Nutricionistas
          </p>
        </div>
      </div>
    `;

    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "no-reply@nutricare.app";
    const fromName = process.env.BREVO_FROM_NAME || "NutriCare";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuração de e-mail não encontrada (BREVO_API_KEY)." },
        { status: 500 }
      );
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: paciente.email, name: paciente.nome }],
        subject: "Formulário de Anamnese — NutriCare",
        htmlContent: htmlEmail,
      }),
    });

    if (!brevoResponse.ok) {
      const brevoError = await brevoResponse.text();
      console.error("Erro Brevo:", brevoError);
      return NextResponse.json(
        { error: "Erro ao enviar e-mail." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Formulário enviado com sucesso!" });
  } catch (err) {
    console.error("Erro enviar-formulario:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
