import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pacienteId, nomePaciente, message, includeShoppingList, includeProtocols, meals, protocols, shoppingList, shoppingDays } = body;

    if (!pacienteId) {
      return NextResponse.json({ error: "ID do paciente não informado." }, { status: 400 });
    }

    // Buscar email do paciente no banco
    const paciente = await prisma.pacientes.findUnique({
      where: { id: pacienteId },
      select: { email: true, nome: true },
    });

    if (!paciente || !paciente.email) {
      return NextResponse.json(
        { error: "Email do paciente não cadastrado. Cadastre o email do paciente antes de enviar." },
        { status: 400 }
      );
    }

    const patientEmail = paciente.email;

    // Montar conteúdo do email em HTML
    let html = `<h2>Plano Alimentar — ${nomePaciente}</h2>`;

    if (message) {
      html += `<p style="color:#555;">${message.replace(/\n/g, "<br>")}</p><hr>`;
    }

    // Refeições
    if (meals && meals.length > 0) {
      html += `<h3>Refeições</h3>`;
      for (const meal of meals) {
        html += `<div style="margin-bottom:12px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;">`;
        html += `<strong>${meal.name}</strong> — ${meal.time}<br>`;
        if (meal.foods && meal.foods.length > 0) {
          html += `<div style="margin-top:6px;"><em>Principais:</em><br>`;
          for (const f of meal.foods) {
            if (f.name) html += `• ${f.name} — <b>${f.qty} ${f.unit}</b><br>`;
          }
          html += `</div>`;
        }
        if (meal.subs) {
          const allSubs = Object.values(meal.subs).flat();
          if (allSubs.length > 0) {
            html += `<div style="margin-top:6px;"><em>Substituições:</em><br>`;
            for (const s of allSubs as { name: string; qty: number; unit: string }[]) {
              if (s.name) html += `• ${s.name} — <b>${s.qty} ${s.unit}</b><br>`;
            }
            html += `</div>`;
          }
        }
        html += `</div>`;
      }
    }

    // Lista de compras
    if (includeShoppingList && shoppingList && shoppingList.length > 0) {
      html += `<h3>Lista de Compras (${shoppingDays} dias)</h3><ul>`;
      for (const item of shoppingList) {
        html += `<li>${item.name} — <b>${item.displayQty || item.qty + " " + item.unit}</b></li>`;
      }
      html += `</ul>`;
    }

    // Protocolos
    if (includeProtocols && protocols && protocols.length > 0) {
      html += `<h3>Protocolos / Orientações</h3>`;
      for (const p of protocols) {
        html += `<div style="margin-bottom:10px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;">`;
        html += `<strong>${p.name}</strong><br>`;
        html += `<p>${(p.content || "").replace(/\n/g, "<br>")}</p>`;
        html += `</div>`;
      }
    }

    html += `<hr><p style="color:#888;font-size:12px;">Enviado pelo NutriCare</p>`;

    // Enviar email via nodemailer (se configurado) ou retornar instrução
    try {
      const nodemailer = await import("nodemailer");

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        return NextResponse.json(
          {
            error:
              "Configuração de email não encontrada. Adicione SMTP_USER e SMTP_PASS no arquivo .env para enviar emails.",
          },
          { status: 500 }
        );
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"NutriCare" <${smtpUser}>`,
        to: patientEmail,
        subject: `Plano Alimentar — ${nomePaciente}`,
        html,
      });

      return NextResponse.json({ message: `Plano enviado para ${patientEmail} com sucesso!` });
    } catch {
      // Se nodemailer não está instalado ou falhou
      return NextResponse.json(
        {
          error: `Para enviar emails, instale o nodemailer (npm install nodemailer @types/nodemailer) e configure SMTP_USER e SMTP_PASS no .env. Email do paciente: ${patientEmail}`,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Erro ao enviar plano:", err);
    return NextResponse.json({ error: "Erro interno ao processar envio." }, { status: 500 });
  }
}
