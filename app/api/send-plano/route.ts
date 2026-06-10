import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function shortFoodName(fullName: string): string {
  if (!fullName) return fullName;
  const parts = fullName.split(',').map(p => p.trim());
  if (parts.length <= 1) return fullName;
  // For names like "Carne, bovina, acém, moído, cozido" → "Acém"
  // For names like "Frango, peito, sem pele, grelhado" → "Frango"
  // Logic: if first word is generic (Carne, Peixe), use second descriptive word
  const generic = ['carne', 'peixe', 'leite', 'queijo', 'pão', 'óleo', 'farinha'];
  if (generic.includes(parts[0].toLowerCase()) && parts.length >= 3) {
    // Return the specific cut/type (e.g., "Acém", "Patinho", "Tilápia")
    return parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
  }
  return parts[0];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      pacienteId, nomePaciente, message, includeShoppingList, includeProtocols,
      meals, protocols, shoppingList, shoppingDays,
      dataNascimento, sexoPaciente, pesoKg, alturaCm,
      massaMuscular, massaAdiposa, percGordura,
    } = body;

    if (!pacienteId) {
      return NextResponse.json({ error: "ID do paciente não informado." }, { status: 400 });
    }

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

    // Build beautiful HTML email matching PDF layout
    let html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Roboto,sans-serif;">
<div style="max-width:700px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <!-- Header -->
  <div style="background:#0f172a;color:#fff;padding:24px 30px;">
    <div style="font-size:22px;font-weight:700;">${nomePaciente}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
      ${dataNascimento ? `Nascimento: ${String(dataNascimento).split('-').reverse().join('/')} | ` : ''}Peso: ${pesoKg || '—'} kg | Altura: ${alturaCm || '—'} cm | Sexo: ${sexoPaciente || '—'}
    </div>
    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
      Massa muscular: ${Number(massaMuscular || 0).toFixed(1)} kg | Massa adiposa: ${Number(massaAdiposa || 0).toFixed(1)} kg | % gordura: ${Number(percGordura || 0).toFixed(1)}%
    </div>
  </div>

  <!-- Title -->
  <div style="text-align:center;font-size:24px;font-weight:700;padding:20px 0 10px;color:#0f172a;">
    Plano Alimentar
  </div>`;

    if (message) {
      html += `<div style="padding:0 30px 16px;color:#555;font-size:13px;">${message.replace(/\n/g, "<br>")}</div>`;
    }

    // Meals in card layout
    if (meals && meals.length > 0) {
      html += `<div style="padding:0 30px;">`;
      for (const meal of meals) {
        const hasFoods = meal.foods && meal.foods.some((f: { name: string }) => f.name);
        const hasSubs = meal.subs && Object.values(meal.subs).some((subs: unknown) => (subs as { name: string }[]).some((s: { name: string }) => s.name));

        html += `
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:10px;margin-bottom:12px;">
          <span style="font-weight:700;font-size:15px;color:#0f172a;">${meal.name}</span>
          <span style="font-size:12px;color:#666;">${meal.time || ''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:50%;vertical-align:top;padding-right:10px;">
              <div style="font-weight:700;font-size:10px;color:#16a34a;text-transform:uppercase;margin-bottom:6px;">PRINCIPAIS</div>`;

        if (hasFoods) {
          for (const f of meal.foods) {
            if (f.name) {
              html += `<div style="font-size:12px;margin-bottom:4px;line-height:1.5;">${f.name} — <strong>${f.qty}${f.unit}</strong></div>`;
            }
          }
        } else {
          html += `<div style="color:#999;font-style:italic;font-size:12px;">—</div>`;
        }

        html += `</td><td style="width:50%;vertical-align:top;padding-left:10px;">
              <div style="font-weight:700;font-size:10px;color:#2563eb;text-transform:uppercase;margin-bottom:6px;">SUBSTITUIÇÕES</div>`;

        if (hasSubs) {
          for (const [foodId, subs] of Object.entries(meal.subs)) {
            const typedSubs = subs as { id: string; name: string; qty: number; unit: string }[];
            const validSubs = typedSubs.filter((s) => s.name);
            if (validSubs.length === 0) continue;
            const mainFood = meal.foods.find((f: { id: string }) => f.id === foodId);
            if (mainFood?.name) {
              html += `<div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:2px;">Substituições p/ ${shortFoodName(mainFood.name)}:</div>`;
            }
            for (const s of validSubs) {
              html += `<div style="font-size:12px;margin-bottom:3px;line-height:1.5;">${s.name} — <strong>${s.qty}${s.unit}</strong></div>`;
            }
          }
        } else {
          html += `<div style="color:#999;font-style:italic;font-size:12px;">—</div>`;
        }

        html += `</td></tr></table></div>`;
      }
      html += `</div>`;
    }

    // Shopping list
    if (includeShoppingList && shoppingList && shoppingList.length > 0) {
      html += `
      <div style="padding:0 30px;margin-top:10px;">
        <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:10px;">Lista de Compras (${shoppingDays} dias)</div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <ul style="margin:0;padding-left:20px;">`;
      for (const item of shoppingList) {
        html += `<li style="font-size:13px;margin-bottom:4px;">${item.name} — <strong>${item.displayQty || item.qty + " " + item.unit}</strong></li>`;
      }
      html += `</ul></div></div>`;
    }

    // Protocols
    if (includeProtocols && protocols && protocols.length > 0) {
      html += `
      <div style="padding:0 30px;margin-top:10px;">
        <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:10px;">Protocolos / Orientações</div>`;
      for (const p of protocols) {
        html += `
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:6px;">${p.name}</div>
          <div style="font-size:13px;color:#334155;line-height:1.6;">${(p.content || "").replace(/\n/g, "<br>")}</div>
        </div>`;
      }
      html += `</div>`;
    }

    // Footer
    html += `
  <div style="padding:20px 30px;border-top:1px solid #e5e7eb;margin-top:20px;text-align:center;">
    <p style="color:#888;font-size:11px;margin:0;">Enviado pelo NutriCare</p>
  </div>
</div>
</body></html>`;

    // Send email
    try {
      const nodemailer = await import("nodemailer");

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        return NextResponse.json(
          { error: "Configuração de email não encontrada. Adicione SMTP_USER e SMTP_PASS no arquivo .env para enviar emails." },
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
      return NextResponse.json(
        { error: `Para enviar emails, instale o nodemailer (npm install nodemailer @types/nodemailer) e configure SMTP_USER e SMTP_PASS no .env. Email do paciente: ${patientEmail}` },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Erro ao enviar plano:", err);
    return NextResponse.json({ error: "Erro interno ao processar envio." }, { status: 500 });
  }
}
