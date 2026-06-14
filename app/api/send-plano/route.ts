import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type MealFood = {
  id?: string;
  name: string;
  qty?: number | string;
  unit?: string;
};

type EnvioMeal = {
  id?: string;
  name: string;
  time?: string;
  foods: MealFood[];
  subs: Record<string, MealFood[]>;
};

type Protocol = {
  id?: string;
  name: string;
  content: string;
};

type ShoppingItem = {
  name: string;
  displayQty?: string;
  qty?: number | string;
  unit?: string;
};

type PdfContext = {
  pdf: PDFDocument;
  page: ReturnType<PDFDocument["addPage"]>;
  fontRegular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  width: number;
  height: number;
  margin: number;
  y: number;
};

function shortFoodName(fullName: string): string {
  if (!fullName) return fullName;
  const parts = fullName.split(",").map((p) => p.trim());
  if (parts.length <= 1) return fullName;
  const generic = ["carne", "peixe", "leite", "queijo", "pão", "óleo", "farinha"];
  if (generic.includes(parts[0].toLowerCase()) && parts.length >= 3) {
    return parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
  }
  return parts[0];
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return String(value || "false").toLowerCase() === "true";
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const normalized = String(value || "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  try {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatDate(value: string) {
  return value ? String(value).split("-").reverse().join("/") : "—";
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapText(text: string, maxWidth: number, font: PdfContext["fontRegular"], size: number) {
  const paragraphs = (text || "").split(/\n+/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = "";
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

async function createPdfContext() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  return {
    pdf,
    page,
    fontRegular,
    fontBold,
    width: page.getWidth(),
    height: page.getHeight(),
    margin: 42,
    y: page.getHeight() - 42,
  } satisfies PdfContext;
}

function addNewPage(ctx: PdfContext) {
  ctx.page = ctx.pdf.addPage([595.28, 841.89]);
  ctx.width = ctx.page.getWidth();
  ctx.height = ctx.page.getHeight();
  ctx.y = ctx.height - ctx.margin;
}

function ensureSpace(ctx: PdfContext, needed = 28) {
  if (ctx.y - needed < ctx.margin) addNewPage(ctx);
}

function drawHeader(ctx: PdfContext, title: string, patientName: string) {
  ensureSpace(ctx, 90);

  ctx.page.drawText("NutriCare", {
    x: ctx.margin,
    y: ctx.y,
    size: 12,
    font: ctx.fontBold,
    color: rgb(0.09, 0.18, 0.28),
  });

  ctx.page.drawText(title, {
    x: ctx.margin,
    y: ctx.y - 24,
    size: 22,
    font: ctx.fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  ctx.page.drawText(patientName, {
    x: ctx.margin,
    y: ctx.y - 48,
    size: 11,
    font: ctx.fontRegular,
    color: rgb(0.39, 0.45, 0.55),
  });

  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y - 60 },
    end: { x: ctx.width - ctx.margin, y: ctx.y - 60 },
    thickness: 1,
    color: rgb(0.88, 0.91, 0.95),
  });

  ctx.y -= 80;
}

function drawSectionTitle(ctx: PdfContext, title: string) {
  ensureSpace(ctx, 26);
  ctx.page.drawText(title, {
    x: ctx.margin,
    y: ctx.y,
    size: 13,
    font: ctx.fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  ctx.y -= 20;
}

function drawParagraph(
  ctx: PdfContext,
  text: string,
  options?: { size?: number; color?: ReturnType<typeof rgb>; indent?: number; lineGap?: number; bold?: boolean }
) {
  const size = options?.size ?? 11;
  const indent = options?.indent ?? 0;
  const lineGap = options?.lineGap ?? 4;
  const font = options?.bold ? ctx.fontBold : ctx.fontRegular;
  const color = options?.color ?? rgb(0.2, 0.27, 0.35);
  const lines = wrapText(text, ctx.width - ctx.margin * 2 - indent, font, size);

  for (const line of lines) {
    ensureSpace(ctx, size + lineGap + 6);
    ctx.page.drawText(line || " ", {
      x: ctx.margin + indent,
      y: ctx.y,
      size,
      font,
      color,
    });
    ctx.y -= size + lineGap;
  }
}

function drawBulletList(ctx: PdfContext, items: string[]) {
  for (const item of items) {
    ensureSpace(ctx, 20);
    ctx.page.drawCircle({
      x: ctx.margin + 4,
      y: ctx.y + 4,
      size: 2,
      color: rgb(0.09, 0.64, 0.29),
    });
    drawParagraph(ctx, item, { indent: 14, size: 11 });
    ctx.y -= 2;
  }
}

function drawInfoLine(ctx: PdfContext, label: string, value: string) {
  drawParagraph(ctx, `${label}: ${value}`, { size: 10, color: rgb(0.39, 0.45, 0.55) });
}

async function buildPlanoPdf(params: {
  nomePaciente: string;
  dataNascimento: string;
  sexoPaciente: string;
  pesoKg: number;
  alturaCm: number;
  massaMuscular: number;
  massaAdiposa: number;
  percGordura: number;
  message: string;
  meals: EnvioMeal[];
}) {
  const ctx = await createPdfContext();

  drawHeader(ctx, "Plano Alimentar", params.nomePaciente);
  drawInfoLine(ctx, "Nascimento", formatDate(params.dataNascimento));
  drawInfoLine(ctx, "Sexo", params.sexoPaciente || "—");
  drawInfoLine(ctx, "Peso", `${params.pesoKg || 0} kg`);
  drawInfoLine(ctx, "Altura", `${params.alturaCm || 0} cm`);
  drawInfoLine(ctx, "Massa muscular", `${Number(params.massaMuscular || 0).toFixed(1)} kg`);
  drawInfoLine(ctx, "Massa adiposa", `${Number(params.massaAdiposa || 0).toFixed(1)} kg`);
  drawInfoLine(ctx, "% de gordura", `${Number(params.percGordura || 0).toFixed(1)}%`);
  ctx.y -= 10;

  if (params.message.trim()) {
    drawSectionTitle(ctx, "Mensagem para o Paciente");
    drawParagraph(ctx, params.message.trim(), { size: 11 });
    ctx.y -= 10;
  }

  drawSectionTitle(ctx, "Plano diário");

  if (params.meals.length === 0) {
    drawParagraph(ctx, "Nenhuma refeição cadastrada.", { color: rgb(0.58, 0.65, 0.72) });
  }

  params.meals.forEach((meal, index) => {
    ensureSpace(ctx, 36);
    ctx.page.drawRectangle({
      x: ctx.margin,
      y: ctx.y - 8,
      width: ctx.width - ctx.margin * 2,
      height: 24,
      color: rgb(0.96, 0.98, 1),
      borderColor: rgb(0.89, 0.93, 0.98),
      borderWidth: 1,
    });

    ctx.page.drawText(`${index + 1}. ${meal.name || "Refeição"}`, {
      x: ctx.margin + 10,
      y: ctx.y,
      size: 11,
      font: ctx.fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    if (meal.time) {
      const timeText = meal.time;
      const timeWidth = ctx.fontRegular.widthOfTextAtSize(timeText, 10);
      ctx.page.drawText(timeText, {
        x: ctx.width - ctx.margin - timeWidth - 10,
        y: ctx.y,
        size: 10,
        font: ctx.fontRegular,
        color: rgb(0.39, 0.45, 0.55),
      });
    }

    ctx.y -= 32;

    const foods = (meal.foods || []).filter((food) => food?.name);
    const allSubs = Object.entries(meal.subs || {});

    drawParagraph(ctx, "Alimentos principais", { size: 10, bold: true, color: rgb(0.09, 0.64, 0.29) });
    if (foods.length === 0) {
      drawParagraph(ctx, "—", { indent: 10, size: 10, color: rgb(0.58, 0.65, 0.72) });
    } else {
      drawBulletList(
        ctx,
        foods.map((food) => `${food.name} — ${food.qty ?? ""} ${food.unit ?? ""}`.trim())
      );
    }

    const hasSubs = allSubs.some(([, subs]) => (subs || []).some((sub) => sub?.name));
    drawParagraph(ctx, "Substituições", { size: 10, bold: true, color: rgb(0.15, 0.39, 0.92) });
    if (!hasSubs) {
      drawParagraph(ctx, "—", { indent: 10, size: 10, color: rgb(0.58, 0.65, 0.72) });
    } else {
      allSubs.forEach(([foodId, subs]) => {
        const validSubs = (subs || []).filter((sub) => sub?.name);
        if (validSubs.length === 0) return;
        const food = foods.find((item) => item.id === foodId);
        if (food?.name) {
          drawParagraph(ctx, `Para ${shortFoodName(food.name)}:`, {
            size: 10,
            bold: true,
            color: rgb(0.11, 0.23, 0.54),
          });
        }
        drawBulletList(
          ctx,
          validSubs.map((sub) => `${sub.name} — ${sub.qty ?? ""} ${sub.unit ?? ""}`.trim())
        );
      });
    }

    ctx.y -= 8;
  });

  return Buffer.from(await ctx.pdf.save());
}

async function buildShoppingListPdf(params: {
  nomePaciente: string;
  shoppingDays: number;
  shoppingList: ShoppingItem[];
}) {
  const ctx = await createPdfContext();
  drawHeader(ctx, `Lista de Compras (${params.shoppingDays} dias)`, params.nomePaciente);
  drawSectionTitle(ctx, "Itens");

  if (params.shoppingList.length === 0) {
    drawParagraph(ctx, "Nenhum item disponível.", { color: rgb(0.58, 0.65, 0.72) });
  } else {
    drawBulletList(
      ctx,
      params.shoppingList.map((item) => `${item.name} — ${item.displayQty || `${item.qty ?? ""} ${item.unit ?? ""}`.trim()}`)
    );
  }

  return Buffer.from(await ctx.pdf.save());
}

async function buildProtocolsPdf(params: {
  nomePaciente: string;
  protocols: Protocol[];
}) {
  const ctx = await createPdfContext();
  drawHeader(ctx, "Protocolos e Orientações", params.nomePaciente);

  if (params.protocols.length === 0) {
    drawParagraph(ctx, "Nenhum protocolo selecionado.", { color: rgb(0.58, 0.65, 0.72) });
  }

  params.protocols.forEach((protocol, index) => {
    drawSectionTitle(ctx, `${index + 1}. ${protocol.name || "Protocolo"}`);
    drawParagraph(ctx, protocol.content || "Sem conteúdo.", { size: 11 });
    ctx.y -= 8;
  });

  return Buffer.from(await ctx.pdf.save());
}

async function buildImagesPdf(params: {
  nomePaciente: string;
  imageFiles: File[];
}) {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  page.drawText("Anexos em imagem", {
    x: 42,
    y: 790,
    size: 22,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawText(params.nomePaciente, {
    x: 42,
    y: 768,
    size: 11,
    font: fontRegular,
    color: rgb(0.39, 0.45, 0.55),
  });

  for (const file of params.imageFiles) {
    page = pdf.addPage([595.28, 841.89]);
    page.drawText(file.name, {
      x: 42,
      y: 790,
      size: 13,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    const bytes = await file.arrayBuffer();
    const mime = file.type || "";
    let image;

    if (mime.includes("png")) {
      image = await pdf.embedPng(bytes);
    } else if (mime.includes("jpeg") || mime.includes("jpg")) {
      image = await pdf.embedJpg(bytes);
    } else {
      const note = `Formato não suportado para conversão em PDF: ${file.name}`;
      page.drawText(note, {
        x: 42,
        y: 740,
        size: 11,
        font: fontRegular,
        color: rgb(0.75, 0.13, 0.13),
      });
      continue;
    }

    const maxWidth = 511;
    const maxHeight = 690;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;

    page.drawImage(image, {
      x: (595.28 - width) / 2,
      y: 60 + (maxHeight - height) / 2,
      width,
      height,
    });
  }

  return Buffer.from(await pdf.save());
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const pacienteId = String(formData.get("pacienteId") || "").trim();
    const nomePaciente = String(formData.get("nomePaciente") || "Paciente").trim();
    const message = String(formData.get("message") || "").trim();
    const includeShoppingList = parseBoolean(formData.get("includeShoppingList"));
    const includeProtocols = parseBoolean(formData.get("includeProtocols"));
    const shoppingDays = parseNumber(formData.get("shoppingDays"), 30);
    const dataNascimento = String(formData.get("dataNascimento") || "").trim();
    const sexoPaciente = String(formData.get("sexoPaciente") || "").trim();
    const pesoKg = parseNumber(formData.get("pesoKg"), 0);
    const alturaCm = parseNumber(formData.get("alturaCm"), 0);
    const massaMuscular = parseNumber(formData.get("massaMuscular"), 0);
    const massaAdiposa = parseNumber(formData.get("massaAdiposa"), 0);
    const percGordura = parseNumber(formData.get("percGordura"), 0);

    const meals = parseJson<EnvioMeal[]>(formData.get("meals"), []);
    const protocols = parseJson<Protocol[]>(formData.get("protocols"), []);
    const shoppingList = parseJson<ShoppingItem[]>(formData.get("shoppingList"), []);

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

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "Configuração de email não encontrada. Adicione SMTP_USER e SMTP_PASS no arquivo .env para enviar emails." },
        { status: 500 }
      );
    }

    const allAttachmentEntries = formData.getAll("attachments");
    const uploadedFiles = allAttachmentEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const imageFiles = uploadedFiles.filter((file) => file.type.startsWith("image/"));
    const pdfFiles = uploadedFiles.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    const otherFiles = uploadedFiles.filter((file) => !imageFiles.includes(file) && !pdfFiles.includes(file));

    const emailSummaryItems = [
      "PDF do Plano Alimentar",
      ...(includeShoppingList && shoppingList.length > 0 ? [`PDF da Lista de Compras (${shoppingDays} dias)`] : []),
      ...(includeProtocols && protocols.length > 0 ? ["PDFs de Protocolos/Orientações"] : []),
      ...(imageFiles.length > 0 ? ["PDF com imagens anexadas"] : []),
      ...(pdfFiles.length > 0 ? ["PDFs enviados em anexo"] : []),
      ...(otherFiles.length > 0 ? ["Arquivos complementares em formato original"] : []),
    ];

    const planoPdf = await buildPlanoPdf({
      nomePaciente: paciente.nome || nomePaciente,
      dataNascimento,
      sexoPaciente,
      pesoKg,
      alturaCm,
      massaMuscular,
      massaAdiposa,
      percGordura,
      message,
      meals,
    });

    const mailAttachments: Array<Record<string, unknown>> = [
      {
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-plano-alimentar.pdf`,
        content: planoPdf,
        contentType: "application/pdf",
      },
    ];

    if (includeShoppingList && shoppingList.length > 0) {
      const shoppingPdf = await buildShoppingListPdf({
        nomePaciente: paciente.nome || nomePaciente,
        shoppingDays,
        shoppingList,
      });
      mailAttachments.push({
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-lista-de-compras.pdf`,
        content: shoppingPdf,
        contentType: "application/pdf",
      });
    }

    if (includeProtocols && protocols.length > 0) {
      const protocolsPdf = await buildProtocolsPdf({
        nomePaciente: paciente.nome || nomePaciente,
        protocols,
      });
      mailAttachments.push({
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-protocolos.pdf`,
        content: protocolsPdf,
        contentType: "application/pdf",
      });
    }

    if (imageFiles.length > 0) {
      const imagesPdf = await buildImagesPdf({
        nomePaciente: paciente.nome || nomePaciente,
        imageFiles,
      });
      mailAttachments.push({
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-anexos-imagens.pdf`,
        content: imagesPdf,
        contentType: "application/pdf",
      });
    }

    const inlineImageCids: string[] = [];
    for (const imageFile of imageFiles) {
      const cid = `${sanitizeFilename(imageFile.name)}-${Math.random().toString(36).slice(2)}@nutricare`;
      inlineImageCids.push(cid);
      mailAttachments.push({
        filename: imageFile.name,
        content: Buffer.from(await imageFile.arrayBuffer()),
        contentType: imageFile.type || "application/octet-stream",
        cid,
        contentDisposition: "inline",
      });
    }

    for (const pdfFile of pdfFiles) {
      mailAttachments.push({
        filename: pdfFile.name,
        content: Buffer.from(await pdfFile.arrayBuffer()),
        contentType: pdfFile.type || "application/pdf",
      });
    }

    for (const file of otherFiles) {
      mailAttachments.push({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
      });
    }

    const messageHtml = message
      ? `
        <div style="margin:0 30px 18px;padding:18px;border:1px solid #dbeafe;border-radius:12px;background:#eff6ff;">
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px;">Mensagem para o Paciente</div>
          <div style="font-size:13px;line-height:1.7;color:#334155;">${escapeHtml(message).replace(/\n/g, "<br>")}</div>
        </div>`
      : "";

    const imagePreviewHtml = inlineImageCids.length
      ? `
        <div style="margin:0 30px 20px;">
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:10px;">Imagens anexadas</div>
          ${inlineImageCids
            .map(
              (cid, index) => `
                <div style="margin-bottom:16px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
                  <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${escapeHtml(imageFiles[index]?.name || `Imagem ${index + 1}`)}</div>
                  <img src="cid:${cid}" alt="Imagem anexada" style="max-width:100%;border-radius:8px;display:block;" />
                </div>`
            )
            .join("")}
        </div>`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#0f172a;color:#fff;padding:24px 30px;">
      <div style="font-size:22px;font-weight:700;">${escapeHtml(nomePaciente)}</div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:6px;">
        ${dataNascimento ? `Nascimento: ${formatDate(dataNascimento)} | ` : ""}
        Peso: ${pesoKg || "—"} kg | Altura: ${alturaCm || "—"} cm | Sexo: ${escapeHtml(sexoPaciente || "—")}
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
        Massa muscular: ${Number(massaMuscular || 0).toFixed(1)} kg | Massa adiposa: ${Number(massaAdiposa || 0).toFixed(1)} kg | % gordura: ${Number(percGordura || 0).toFixed(1)}%
      </div>
    </div>

    <div style="padding:22px 30px 10px;">
      <div style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:8px;">Plano Alimentar enviado</div>
      <div style="font-size:13px;color:#475569;line-height:1.7;">
        Os arquivos em PDF seguem anexados para download. Abaixo está o resumo do envio realizado.
      </div>
    </div>

    ${messageHtml}

    <div style="margin:0 30px 18px;padding:16px;border:1px solid #bbf7d0;border-radius:12px;background:#f0fdf4;">
      <div style="font-size:16px;font-weight:700;color:#166534;margin-bottom:8px;">Arquivos enviados</div>
      <ul style="margin:0;padding-left:20px;color:#166534;font-size:13px;line-height:1.8;">
        ${emailSummaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>

    ${imagePreviewHtml}

    <div style="padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#888;font-size:11px;margin:0;">Enviado pelo NutriCare</p>
    </div>
  </div>
</body>
</html>`;

    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"NutriCare" <${smtpUser}>`,
        to: paciente.email,
        subject: `Plano Alimentar — ${nomePaciente}`,
        html,
        attachments: mailAttachments,
      });

      return NextResponse.json({
        message: `Plano enviado para ${paciente.email} com sucesso! Os PDFs seguem anexados para download.`,
      });
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      return NextResponse.json(
        { error: "Falha ao enviar o email. Verifique SMTP_USER, SMTP_PASS e a instalação do nodemailer." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Erro ao enviar plano:", err);
    return NextResponse.json({ error: "Erro interno ao processar envio." }, { status: 500 });
  }
}
