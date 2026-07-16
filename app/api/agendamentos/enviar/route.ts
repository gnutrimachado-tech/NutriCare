import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function gerarICS(params: {
  titulo: string;
  dataInicio: string;
  dataFim: string;
  descricao: string;
  local: string;
  uid: string;
}): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NutriCare//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}@nutricare`,
    `DTSTAMP:${now}`,
    `DTSTART:${params.dataInicio}`,
    `DTEND:${params.dataFim}`,
    `SUMMARY:${params.titulo}`,
    `DESCRIPTION:${params.descricao}`,
    `LOCATION:${params.local}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function toICSDate(date: Date, timeDate: Date): string {
  const d = new Date(date);
  const t = new Date(timeDate);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(t.getUTCHours()).padStart(2, "0");
  const min = String(t.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${min}00Z`;
}

export async function POST(req: NextRequest) {
  try {
    const { agendamento_id } = await req.json();

    if (!agendamento_id) {
      return NextResponse.json({ error: "agendamento_id obrigatório" }, { status: 400 });
    }

    const agendamento = await prisma.agendamentos.findUnique({
      where: { id: agendamento_id },
      include: { pacientes: { select: { nome: true, email: true } } },
    });

    if (!agendamento) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const pacienteEmail = agendamento.pacientes.email;
    if (!pacienteEmail) {
      return NextResponse.json({ error: "Paciente sem e-mail cadastrado" }, { status: 400 });
    }

    const token = agendamento.confirmation_token;
    if (!token) {
      return NextResponse.json({ error: "Token de confirmação ausente" }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const urlConfirmar = `${baseUrl}/api/agendamentos/confirmar?token=${token}&acao=confirmar`;
    const urlRecusar = `${baseUrl}/api/agendamentos/confirmar?token=${token}&acao=recusar`;

    const dataFormatada = new Date(agendamento.data_agendamento).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const horarioFormatado = new Date(agendamento.horario).toLocaleTimeString("pt-BR", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    });

    const dataInicio = toICSDate(agendamento.data_agendamento, agendamento.horario);
    const horarioFim = new Date(agendamento.horario);
    horarioFim.setUTCMinutes(horarioFim.getUTCMinutes() + 60);
    const dataFim = toICSDate(agendamento.data_agendamento, horarioFim);

    const icsContent = gerarICS({
      titulo: `Consulta NutriCare — ${agendamento.tipo || "Consulta"}`,
      dataInicio,
      dataFim,
      descricao: `Consulta de nutrição com NutriCare\\nTipo: ${agendamento.tipo || "Consulta"}`,
      local: "NutriCare",
      uid: agendamento.id,
    });

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe3ec;">
    <div style="padding:28px 32px;background:linear-gradient(135deg,#1e5fa8 0%,#183865 100%);color:#fff;">
      <div style="font-size:22px;font-weight:700;margin-bottom:4px;">NutriCare</div>
      <div style="font-size:16px;font-weight:600;">Confirmação de Consulta</div>
    </div>

    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#334155;line-height:1.7;margin-bottom:20px;">
        Olá, <strong>${agendamento.pacientes.nome}</strong>!<br><br>
        Estou enviando este e-mail para a confirmação da sua consulta!<br>
        Responda <strong>sim</strong> ou <strong>não</strong> clicando nos botões abaixo.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:13px;color:#64748b;margin-bottom:6px;">📅 Data e horário</div>
        <div style="font-size:16px;font-weight:700;color:#1e293b;">${dataFormatada} às ${horarioFormatado}</div>
        <div style="font-size:13px;color:#64748b;margin-top:8px;">Tipo: ${agendamento.tipo || "Consulta inicial"}</div>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:28px;">
        <a href="${urlConfirmar}" style="flex:1;display:block;text-align:center;background:#16a34a;color:#ffffff;font-weight:700;font-size:15px;padding:14px 0;border-radius:10px;text-decoration:none;">
          ✅ &nbsp;Confirmar consulta
        </a>
        <a href="${urlRecusar}" style="flex:1;display:block;text-align:center;background:#dc2626;color:#ffffff;font-weight:700;font-size:15px;padding:14px 0;border-radius:10px;text-decoration:none;">
          ❌ &nbsp;Recusar consulta
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;line-height:1.6;">
        O arquivo de calendário (.ics) está anexo neste e-mail.<br>
        Abra-o para adicionar a consulta à sua agenda no iOS ou Android.
      </p>
    </div>

    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
      NutriCare — Sistema de Nutrição
    </div>
  </div>
</body>
</html>`;

    const smtpUser = process.env.SMTP_USER || process.env.BREVO_FROM_EMAIL;
    const brevoApiKey = process.env.BREVO_API_KEY;

    if (brevoApiKey) {
      const brevoFromEmail = process.env.BREVO_FROM_EMAIL || smtpUser || "";
      const brevoFromName = process.env.BREVO_FROM_NAME || "NutriCare";

      const body = {
        sender: { name: brevoFromName, email: brevoFromEmail },
        to: [{ email: pacienteEmail, name: agendamento.pacientes.nome }],
        subject: `Confirmação de consulta — ${dataFormatada} às ${horarioFormatado}`,
        htmlContent: html,
        attachment: [
          {
            name: "consulta-nutricare.ics",
            content: Buffer.from(icsContent).toString("base64"),
          },
        ],
      };

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error((err as { message?: string }).message || `Brevo HTTP ${res.status}`);
      }
    } else {
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

      if (!smtpUser || !smtpPass) {
        return NextResponse.json({ error: "Configuração de e-mail não encontrada" }, { status: 500 });
      }

      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `NutriCare <${smtpUser}>`,
        to: pacienteEmail,
        subject: `Confirmação de consulta — ${dataFormatada} às ${horarioFormatado}`,
        html,
        attachments: [{ filename: "consulta-nutricare.ics", content: icsContent, contentType: "text/calendar" }],
      });
    }

    await prisma.agendamentos.update({
      where: { id: agendamento_id },
      data: { email_enviado: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao enviar e-mail" },
      { status: 500 }
    );
  }
}
