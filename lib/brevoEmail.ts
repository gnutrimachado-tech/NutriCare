// lib/brevoEmail.ts
// Wrapper minimalista para envio via Brevo (API v3 /smtp/email).
// Reusa suas env vars já configuradas na Vercel.

export interface BrevoAttachment {
  name: string;
  content: string;
}

export interface BrevoSendArgs {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  text?: string;
  attachments?: BrevoAttachment[];
  replyTo?: { email: string; name?: string };
}

export async function sendBrevoEmail(args: BrevoSendArgs) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ??
    process.env.BREVO_FROM_EMAIL ??
    process.env.MAIL_FROM ??
    "no-reply@nutricare.app";
  const senderName =
    process.env.BREVO_SENDER_NAME ??
    process.env.BREVO_FROM_NAME ??
    "NutriCare";

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY ausente. Configure em .env.local e na Vercel (Settings → Environment Variables)."
    );
  }

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: args.to,
    subject: args.subject,
    htmlContent: args.html,
    textContent: args.text,
    attachment: args.attachments,
    replyTo: args.replyTo,
  };

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Brevo erro ${resp.status}: ${body}`);
  }
  return await resp.json().catch(() => ({}));
}

export function bufferToBase64(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}
