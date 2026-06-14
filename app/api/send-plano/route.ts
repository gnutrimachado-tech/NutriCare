import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import { promises as fs } from "fs";
import path from "path";

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

type LayoutDoc = {
  pdf: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  fontScript: PDFFont | null;
  logo: PDFImage | null;
  background: PDFImage | null;
};

type BasePageOptions = {
  title: string;
  nomePaciente: string;
  dataNascimento?: string;
  sexoPaciente?: string;
  pesoKg?: number;
  alturaCm?: number;
  massaMuscular?: number;
  massaAdiposa?: number;
  percGordura?: number;
  showMetrics?: boolean;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_X = 28;
const HEADER_TOP = PAGE_HEIGHT - 24;
const BACKGROUND_OPACITY = 0.15; // 85% de transparência
const FOOTER_LOGO_OPACITY = 0.15; // 85% de transparência
const CRN_LABEL = process.env.NUTRICARE_CRN || "CRN:";

const assetCache = new Map<string, Buffer | null>();
let cachedTransporter:
  | { key: string; transporter: { sendMail: (options: Record<string, unknown>) => Promise<unknown> } }
  | null = null;

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

function formatMetric(value: number | undefined, suffix = "") {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(1).replace(".", ",")}${suffix}`;
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

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const paragraphs = String(text || "").split(/\n+/);
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
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
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

function fitText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const safeText = String(text || "");
  if (font.widthOfTextAtSize(safeText, size) <= maxWidth) return safeText;

  let current = safeText;
  while (current.length > 1 && font.widthOfTextAtSize(`${current}…`, size) > maxWidth) {
    current = current.slice(0, -1);
  }
  return `${current.trimEnd()}…`;
}

async function readPublicAsset(...relativeCandidates: string[]) {
  for (const relativePath of relativeCandidates) {
    if (assetCache.has(relativePath)) {
      const cached = assetCache.get(relativePath);
      if (cached) return cached;
      continue;
    }

    const absolutePath = path.join(process.cwd(), "public", relativePath);
    try {
      const buffer = await fs.readFile(absolutePath);
      assetCache.set(relativePath, buffer);
      return buffer;
    } catch {
      assetCache.set(relativePath, null);
    }
  }
  return null;
}

async function createLayoutDoc(): Promise<LayoutDoc> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const [scriptFontBytes, logoBytes, backgroundBytes] = await Promise.all([
    readPublicAsset("fonts/GreatVibes-Regular.ttf"),
    readPublicAsset("layouts/logo-nutricare-ref.png", "logo-nutricare.png"),
    readPublicAsset("layouts/fundo-layout.png", "nutri-coracao.png"),
  ]);

  const fontScript = scriptFontBytes ? await pdf.embedFont(scriptFontBytes) : null;
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null;
  const background = backgroundBytes ? await pdf.embedPng(backgroundBytes) : null;

  return { pdf, fontRegular, fontBold, fontScript, logo, background };
}

function drawCoverImage(page: PDFPage, image: PDFImage, opacity: number) {
  const scale = Math.max(PAGE_WIDTH / image.width, PAGE_HEIGHT / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (PAGE_WIDTH - width) / 2;
  const y = (PAGE_HEIGHT - height) / 2;

  page.drawImage(image, { x, y, width, height, opacity });
}

function drawHeader(doc: LayoutDoc, page: PDFPage, options: BasePageOptions) {
  if (doc.background) drawCoverImage(page, doc.background, BACKGROUND_OPACITY);

  if (doc.logo) {
    const targetWidth = 84;
    const targetHeight = (doc.logo.height / doc.logo.width) * targetWidth;
    page.drawImage(doc.logo, {
      x: PAGE_MARGIN_X,
      y: HEADER_TOP - targetHeight - 4,
      width: targetWidth,
      height: targetHeight,
    });
  } else {
    page.drawText("NutriCare", {
      x: PAGE_MARGIN_X,
      y: HEADER_TOP - 18,
      size: 14,
      font: doc.fontBold,
      color: rgb(0.13, 0.2, 0.24),
    });
  }

  const infoX = PAGE_MARGIN_X + 102;
  const patientName = fitText(options.nomePaciente || "Paciente", 230, doc.fontBold, 16);
  page.drawText(patientName, {
    x: infoX,
    y: HEADER_TOP - 28,
    size: 16,
    font: doc.fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const patientInfo = [
    `nascimento: ${formatDate(options.dataNascimento || "")}`,
    `peso: ${Number(options.pesoKg || 0).toFixed(1).replace(".", ",")}kg`,
    `altura: ${Math.round(Number(options.alturaCm || 0)) || 0}cm`,
    `sexo: ${String(options.sexoPaciente || "—").toLowerCase()}`,
  ].join("   |   ");

  page.drawText(fitText(patientInfo, 265, doc.fontRegular, 7.5), {
    x: infoX,
    y: HEADER_TOP - 41,
    size: 7.5,
    font: doc.fontRegular,
    color: rgb(0.38, 0.38, 0.38),
  });

  if (options.showMetrics) {
    const rightX = PAGE_WIDTH - PAGE_MARGIN_X - 120;
    const metrics = [
      `massa muscular: ${formatMetric(options.massaMuscular, "kg")}`,
      `massa adiposa: ${formatMetric(options.massaAdiposa, "kg")}`,
      `% de gordura: ${formatMetric(options.percGordura, "%")}`,
    ];

    metrics.forEach((line, index) => {
      page.drawText(fitText(line, 120, doc.fontRegular, 7.2), {
        x: rightX,
        y: HEADER_TOP - 18 - index * 10,
        size: 7.2,
        font: doc.fontRegular,
        color: rgb(0.24, 0.24, 0.24),
      });
    });
  }

  page.drawLine({
    start: { x: PAGE_MARGIN_X, y: HEADER_TOP - 52 },
    end: { x: PAGE_WIDTH - PAGE_MARGIN_X, y: HEADER_TOP - 52 },
    thickness: 1,
    color: rgb(0.15, 0.15, 0.15),
  });

  const titleWidth = doc.fontBold.widthOfTextAtSize(options.title, 17);
  page.drawText(options.title, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: HEADER_TOP - 74,
    size: 17,
    font: doc.fontBold,
    color: rgb(0.08, 0.08, 0.08),
  });
}

function drawFooter(doc: LayoutDoc, page: PDFPage) {
  const footerY = 56;

  page.drawLine({
    start: { x: PAGE_MARGIN_X + 4, y: footerY + 18 },
    end: { x: PAGE_MARGIN_X + 132, y: footerY + 18 },
    thickness: 0.8,
    color: rgb(0.2, 0.2, 0.2),
  });

  if (doc.fontScript) {
    page.drawText("Nutricionista", {
      x: PAGE_MARGIN_X,
      y: footerY + 20,
      size: 22,
      font: doc.fontScript,
      color: rgb(0.12, 0.12, 0.12),
    });
  } else {
    page.drawText("Nutricionista", {
      x: PAGE_MARGIN_X,
      y: footerY + 20,
      size: 13,
      font: doc.fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });
  }

  page.drawText(CRN_LABEL, {
    x: PAGE_MARGIN_X,
    y: footerY + 5,
    size: 9,
    font: doc.fontRegular,
    color: rgb(0.25, 0.25, 0.25),
  });

  if (doc.logo) {
    const targetWidth = 42;
    const targetHeight = (doc.logo.height / doc.logo.width) * targetWidth;
    page.drawImage(doc.logo, {
      x: PAGE_WIDTH - PAGE_MARGIN_X - targetWidth,
      y: footerY - 2,
      width: targetWidth,
      height: targetHeight,
      opacity: FOOTER_LOGO_OPACITY,
    });
  }
}

function addBasePage(doc: LayoutDoc, options: BasePageOptions) {
  const page = doc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeader(doc, page, options);
  drawFooter(doc, page);
  return page;
}

function getMealLines(meal: EnvioMeal | undefined) {
  const mainLines = (meal?.foods || [])
    .filter((food) => food?.name)
    .map((food) => `${food.name} — ${String(food.qty ?? "")} ${String(food.unit ?? "").trim()}`.replace(/\s+/g, " ").trim());

  const subLines: string[] = [];
  Object.entries(meal?.subs || {}).forEach(([foodId, subs]) => {
    const validSubs = (subs || []).filter((sub) => sub?.name);
    if (validSubs.length === 0) return;

    const mainFood = (meal?.foods || []).find((food) => food.id === foodId);
    if (mainFood?.name) subLines.push(`Para ${shortFoodName(mainFood.name)}:`);
    validSubs.forEach((sub) => {
      subLines.push(`${sub.name} — ${String(sub.qty ?? "")} ${String(sub.unit ?? "").trim()}`.replace(/\s+/g, " ").trim());
    });
  });

  return { mainLines, subLines };
}

function drawTextBlock(params: {
  page: PDFPage;
  font: PDFFont;
  textLines: string[];
  x: number;
  y: number;
  width: number;
  maxHeight: number;
  fontSize: number;
  lineGap: number;
  color: ReturnType<typeof rgb>;
}) {
  const { page, font, textLines, x, y, width, maxHeight, fontSize, lineGap, color } = params;
  let cursorY = y;
  let consumed = 0;
  const lineHeight = fontSize + lineGap;

  for (const line of textLines) {
    const wrapped = wrapText(line, width, font, fontSize);
    for (const subLine of wrapped) {
      if (consumed + lineHeight > maxHeight) {
        page.drawText("…", {
          x,
          y: cursorY,
          size: fontSize,
          font,
          color,
        });
        return;
      }
      page.drawText(subLine || " ", { x, y: cursorY, size: fontSize, font, color });
      cursorY -= lineHeight;
      consumed += lineHeight;
    }
  }
}

function drawMealBox(doc: LayoutDoc, page: PDFPage, x: number, y: number, width: number, height: number, meal?: EnvioMeal) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.15, 0.15, 0.15),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const headerY = y + height - 18;
  page.drawText(fitText(meal?.name || "nome da refeição", width - 86, doc.fontBold, 10), {
    x: x + 10,
    y: headerY,
    size: 10,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawText(fitText(meal?.time || "horário", 48, doc.fontBold, 7.5), {
    x: x + width - 54,
    y: headerY + 1,
    size: 7.5,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawLine({
    start: { x: x + 10, y: y + height - 24 },
    end: { x: x + width - 10, y: y + height - 24 },
    thickness: 0.9,
    color: rgb(0.15, 0.15, 0.15),
  });

  const innerTop = y + height - 34;
  const colGap = 12;
  const innerWidth = width - 20;
  const colWidth = (innerWidth - colGap) / 2;
  const leftX = x + 10;
  const rightX = leftX + colWidth + colGap;

  page.drawText("principais", {
    x: leftX,
    y: innerTop,
    size: 7.2,
    font: doc.fontRegular,
    color: rgb(0.09, 0.58, 0.21),
  });

  page.drawText("substituições", {
    x: rightX,
    y: innerTop,
    size: 7.2,
    font: doc.fontRegular,
    color: rgb(0.14, 0.39, 0.84),
  });

  const { mainLines, subLines } = getMealLines(meal);
  const contentY = innerTop - 11;
  const maxContentHeight = height - 54;

  drawTextBlock({
    page,
    font: doc.fontRegular,
    textLines: mainLines.length > 0 ? mainLines : ["—"],
    x: leftX,
    y: contentY,
    width: colWidth,
    maxHeight: maxContentHeight,
    fontSize: 6.8,
    lineGap: 2.4,
    color: rgb(0.14, 0.14, 0.14),
  });

  drawTextBlock({
    page,
    font: doc.fontRegular,
    textLines: subLines.length > 0 ? subLines : ["—"],
    x: rightX,
    y: contentY,
    width: colWidth,
    maxHeight: maxContentHeight,
    fontSize: 6.8,
    lineGap: 2.4,
    color: rgb(0.14, 0.14, 0.14),
  });
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
  meals: EnvioMeal[];
}) {
  const doc = await createLayoutDoc();
  const chunks: EnvioMeal[][] = [];
  const meals = params.meals.length > 0 ? params.meals : [];

  for (let index = 0; index < Math.max(meals.length, 1); index += 6) {
    chunks.push(meals.slice(index, index + 6));
  }

  chunks.forEach((chunk) => {
    const page = addBasePage(doc, {
      title: "plano alimentar",
      nomePaciente: params.nomePaciente,
      dataNascimento: params.dataNascimento,
      sexoPaciente: params.sexoPaciente,
      pesoKg: params.pesoKg,
      alturaCm: params.alturaCm,
      massaMuscular: params.massaMuscular,
      massaAdiposa: params.massaAdiposa,
      percGordura: params.percGordura,
      showMetrics: true,
    });

    const gridX = PAGE_MARGIN_X + 10;
    const gridY = 154;
    const colGap = 10;
    const rowGap = 12;
    const boxWidth = 248;
    const boxHeight = 145;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const slotIndex = row * 2 + col;
        const meal = chunk[slotIndex];
        const x = gridX + col * (boxWidth + colGap);
        const y = gridY + (2 - row) * (boxHeight + rowGap);
        drawMealBox(doc, page, x, y, boxWidth, boxHeight, meal);
      }
    }
  });

  return Buffer.from(await doc.pdf.save());
}

// ==================== FUNÇÃO OTIMIZADA: Pré-carregar assets uma vez ====================
// Cache global para assets compartilhados entre chamadas
let cachedAssets: { logo: Buffer | null; background: Buffer | null; fontScript: Buffer | null } | null = null;

async function preloadAssets(): Promise<{ logo: Buffer | null; background: Buffer | null; fontScript: Buffer | null }> {
  if (cachedAssets) return cachedAssets;
  
  const [fontScript, logo, background] = await Promise.all([
    readPublicAsset("fonts/GreatVibes-Regular.ttf"),
    readPublicAsset("layouts/logo-nutricare-ref.png", "logo-nutricare.png"),
    readPublicAsset("layouts/fundo-layout.png", "nutri-coracao.png"),
  ]);
  
  cachedAssets = { fontScript, logo, background };
  return cachedAssets;
}

// Função para criar documento PDF com assets pré-carregados
async function createLayoutDocOptimized(): Promise<LayoutDoc> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Usar assets pré-carregados
  const assets = await preloadAssets();
  
  const fontScript = assets.fontScript ? await pdf.embedFont(assets.fontScript) : null;
  const logo = assets.logo ? await pdf.embedPng(assets.logo) : null;
  const background = assets.background ? await pdf.embedPng(assets.background) : null;

  return { pdf, fontRegular, fontBold, fontScript, logo, background };
}

// Função otimizada para gerar todos os PDFs usando assets compartilhados
async function buildAllPdfsOptimized(params: {
  nomePaciente: string;
  dataNascimento: string;
  sexoPaciente: string;
  pesoKg: number;
  alturaCm: number;
  massaMuscular: number;
  massaAdiposa: number;
  percGordura: number;
  meals: EnvioMeal[];
  includeShoppingList: boolean;
  shoppingDays: number;
  shoppingList: ShoppingItem[];
  includeProtocols: boolean;
  protocols: Protocol[];
}): Promise<{ planoPdf: Buffer; shoppingPdf: Buffer | null; protocolsPdf: Buffer | null }> {
  // Pré-carregar assets UMA vez
  await preloadAssets();
  
  // Criar documentos para cada tipo de PDF
  const [planoDoc, shoppingDoc, protocolsDoc] = await Promise.all([
    createLayoutDocOptimized(),
    params.includeShoppingList ? createLayoutDocOptimized() : Promise.resolve(null),
    params.includeProtocols ? createLayoutDocOptimized() : Promise.resolve(null),
  ]);

  // Gerar páginas do Plano Alimentar
  const chunks: EnvioMeal[][] = [];
  const meals = params.meals.length > 0 ? params.meals : [];
  for (let index = 0; index < Math.max(meals.length, 1); index += 6) {
    chunks.push(meals.slice(index, index + 6));
  }

  chunks.forEach((chunk) => {
    const page = planoDoc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(planoDoc, page, {
      title: "plano alimentar",
      nomePaciente: params.nomePaciente,
      dataNascimento: params.dataNascimento,
      sexoPaciente: params.sexoPaciente,
      pesoKg: params.pesoKg,
      alturaCm: params.alturaCm,
      massaMuscular: params.massaMuscular,
      massaAdiposa: params.massaAdiposa,
      percGordura: params.percGordura,
      showMetrics: true,
    });

    const gridX = PAGE_MARGIN_X + 10;
    const gridY = 154;
    const colGap = 10;
    const rowGap = 12;
    const boxWidth = 248;
    const boxHeight = 145;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const slotIndex = row * 2 + col;
        const meal = chunk[slotIndex];
        const x = gridX + col * (boxWidth + colGap);
        const y = gridY + (2 - row) * (boxHeight + rowGap);
        drawMealBox(planoDoc, page, x, y, boxWidth, boxHeight, meal);
      }
    }
    drawFooter(planoDoc, page);
  });

  // Gerar páginas da Lista de Compras
  let shoppingPdf: Buffer | null = null;
  if (shoppingDoc && params.includeShoppingList) {
    const items = params.shoppingList.length > 0 ? params.shoppingList : [{ name: "Nenhum item disponível", displayQty: "—" }];
    const perPage = 24;

    for (let start = 0; start < items.length; start += perPage) {
      const page = shoppingDoc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawHeader(shoppingDoc, page, {
        title: "lista de compras",
        nomePaciente: params.nomePaciente,
        dataNascimento: params.dataNascimento,
        sexoPaciente: params.sexoPaciente,
        pesoKg: params.pesoKg,
        alturaCm: params.alturaCm,
        showMetrics: false,
      });
      drawShoppingFrame(shoppingDoc, page, items.slice(start, start + perPage), params.shoppingDays);
      drawFooter(shoppingDoc, page);
    }
    shoppingPdf = Buffer.from(await shoppingDoc.pdf.save());
  }

  // Gerar páginas de Orientações
  let protocolsPdf: Buffer | null = null;
  if (protocolsDoc && params.includeProtocols) {
    const protos = params.protocols.length > 0 ? params.protocols : [{ name: "Sem orientações", content: "" }];
    const perPage = 7;

    for (let start = 0; start < protos.length; start += perPage) {
      const page = protocolsDoc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawHeader(protocolsDoc, page, {
        title: "orientações",
        nomePaciente: params.nomePaciente,
        dataNascimento: params.dataNascimento,
        sexoPaciente: params.sexoPaciente,
        pesoKg: params.pesoKg,
        alturaCm: params.alturaCm,
        showMetrics: false,
      });

      const slice = protos.slice(start, start + perPage);
      const boxX = PAGE_MARGIN_X + 10;
      const boxWidth = PAGE_WIDTH - (PAGE_MARGIN_X + 10) * 2;
      const boxHeight = 58;
      const gap = 12;
      let currentY = 160 + (perPage - 1) * (boxHeight + gap);

      slice.forEach((protocol) => {
        drawProtocolBox(protocolsDoc, page, boxX, currentY, boxWidth, boxHeight, protocol);
        currentY -= boxHeight + gap;
      });
      drawFooter(protocolsDoc, page);
    }
    protocolsPdf = Buffer.from(await protocolsDoc.pdf.save());
  }

  return {
    planoPdf: Buffer.from(await planoDoc.pdf.save()),
    shoppingPdf,
    protocolsPdf,
  };
}

function drawShoppingFrame(doc: LayoutDoc, page: PDFPage, items: ShoppingItem[], shoppingDays: number) {
  const boxX = PAGE_MARGIN_X + 12;
  const boxY = 150;
  const boxWidth = PAGE_WIDTH - (PAGE_MARGIN_X + 12) * 2;
  const boxHeight = 476;

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.16, 0.16, 0.16),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  page.drawText(`quantidades totais para ${shoppingDays} dias`, {
    x: boxX + 16,
    y: boxY + boxHeight - 22,
    size: 8.5,
    font: doc.fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  let cursorY = boxY + boxHeight - 48;
  const lineHeight = 17;

  items.forEach((item, index) => {
    if (cursorY < boxY + 18) return;

    page.drawCircle({
      x: boxX + 13,
      y: cursorY + 4,
      size: 3,
      color: rgb(0.17, 0.63, 0.28),
    });

    const itemLabel = fitText(item.name, 220, doc.fontRegular, 11);
    const qtyText = fitText(item.displayQty || `${item.qty ?? ""} ${item.unit ?? ""}`.trim(), 120, doc.fontRegular, 11);
    const dots = ".".repeat(Math.max(6, 34 - itemLabel.length - qtyText.length));
    const line = `${itemLabel}${dots}${qtyText}`;

    page.drawText(line, {
      x: boxX + 20,
      y: cursorY,
      size: 11,
      font: doc.fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    cursorY -= lineHeight;
    if (index === items.length - 1 && items.length === 0) cursorY -= 0;
  });
}

async function buildShoppingListPdf(params: {
  nomePaciente: string;
  dataNascimento: string;
  sexoPaciente: string;
  pesoKg: number;
  alturaCm: number;
  shoppingDays: number;
  shoppingList: ShoppingItem[];
}) {
  const doc = await createLayoutDoc();
  const items = params.shoppingList.length > 0 ? params.shoppingList : [{ name: "Nenhum item disponível", displayQty: "—" }];
  const perPage = 24;

  for (let start = 0; start < items.length; start += perPage) {
    const page = addBasePage(doc, {
      title: "lista de compras",
      nomePaciente: params.nomePaciente,
      dataNascimento: params.dataNascimento,
      sexoPaciente: params.sexoPaciente,
      pesoKg: params.pesoKg,
      alturaCm: params.alturaCm,
      showMetrics: false,
    });

    drawShoppingFrame(doc, page, items.slice(start, start + perPage), params.shoppingDays);
  }

  return Buffer.from(await doc.pdf.save());
}

function drawProtocolBox(doc: LayoutDoc, page: PDFPage, x: number, y: number, width: number, height: number, protocol?: Protocol) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.16, 0.16, 0.16),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  page.drawText(fitText(protocol?.name || "nome da orientação", width - 16, doc.fontRegular, 7.8), {
    x: x + 8,
    y: y + height - 12,
    size: 7.8,
    font: doc.fontRegular,
    color: rgb(0.16, 0.16, 0.16),
  });

  page.drawText("orientação................................", {
    x: x + 8,
    y: y + height - 24,
    size: 7,
    font: doc.fontRegular,
    color: rgb(0.28, 0.28, 0.28),
  });

  const contentLines = protocol?.content
    ? wrapText(protocol.content, width - 16, doc.fontRegular, 8)
    : [];

  drawTextBlock({
    page,
    font: doc.fontRegular,
    textLines: contentLines,
    x: x + 8,
    y: y + height - 38,
    width: width - 16,
    maxHeight: height - 46,
    fontSize: 8,
    lineGap: 3,
    color: rgb(0.16, 0.16, 0.16),
  });
}

async function buildProtocolsPdf(params: {
  nomePaciente: string;
  dataNascimento: string;
  sexoPaciente: string;
  pesoKg: number;
  alturaCm: number;
  protocols: Protocol[];
}) {
  const doc = await createLayoutDoc();
  const protocols = params.protocols.length > 0 ? params.protocols : [{ name: "Sem orientações selecionadas", content: "" }];
  const perPage = 7;

  for (let start = 0; start < protocols.length; start += perPage) {
    const page = addBasePage(doc, {
      title: "orientações",
      nomePaciente: params.nomePaciente,
      dataNascimento: params.dataNascimento,
      sexoPaciente: params.sexoPaciente,
      pesoKg: params.pesoKg,
      alturaCm: params.alturaCm,
      showMetrics: false,
    });

    const slice = protocols.slice(start, start + perPage);
    const boxX = PAGE_MARGIN_X + 10;
    const boxWidth = PAGE_WIDTH - (PAGE_MARGIN_X + 10) * 2;
    const boxHeight = 58;
    const gap = 12;
    let currentY = 160 + (perPage - 1) * (boxHeight + gap);

    slice.forEach((protocol) => {
      drawProtocolBox(doc, page, boxX, currentY, boxWidth, boxHeight, protocol);
      currentY -= boxHeight + gap;
    });
  }

  return Buffer.from(await doc.pdf.save());
}

async function getTransporter(config: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}) {
  const key = `${config.smtpHost}:${config.smtpPort}:${config.smtpUser}`;
  if (cachedTransporter?.key === key) return cachedTransporter.transporter;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });

  cachedTransporter = { key, transporter };
  return transporter;
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

    const emailSummaryItems = [
      "PDF do plano alimentar com o novo layout",
      ...(includeShoppingList && shoppingList.length > 0 ? [`PDF da lista de compras (${shoppingDays} dias)`] : []),
      ...(includeProtocols && protocols.length > 0 ? ["PDF das orientações"] : []),
      ...(uploadedFiles.length > 0 ? ["arquivos complementares anexados"] : []),
    ];

    // Usar função otimizada que pré-carrega assets uma única vez
    const { planoPdf, shoppingPdf, protocolsPdf } = await buildAllPdfsOptimized({
      nomePaciente: paciente.nome || nomePaciente,
      dataNascimento,
      sexoPaciente,
      pesoKg,
      alturaCm,
      massaMuscular,
      massaAdiposa,
      percGordura,
      meals,
      includeShoppingList,
      shoppingDays,
      shoppingList,
      includeProtocols,
      protocols,
    });

    const mailAttachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
      {
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-plano-alimentar.pdf`,
        content: planoPdf,
        contentType: "application/pdf",
      },
    ];

    if (shoppingPdf) {
      mailAttachments.push({
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-lista-de-compras.pdf`,
        content: shoppingPdf,
        contentType: "application/pdf",
      });
    }

    if (protocolsPdf) {
      mailAttachments.push({
        filename: `${sanitizeFilename(nomePaciente || paciente.nome || "paciente")}-orientacoes.pdf`,
        content: protocolsPdf,
        contentType: "application/pdf",
      });
    }

    for (const file of uploadedFiles) {
      mailAttachments.push({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
      });
    }

    const messageHtml = message
      ? `
        <div style="margin:18px 28px 0;padding:16px 18px;border:1px solid #d7e3ef;border-radius:12px;background:#f8fbff;">
          <div style="font-size:15px;font-weight:700;color:#14324a;margin-bottom:8px;">Mensagem do nutricionista</div>
          <div style="font-size:13px;line-height:1.7;color:#334155;">${escapeHtml(message).replace(/\n/g, "<br>")}</div>
        </div>`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#eef3f8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe3ec;">
    <div style="padding:24px 28px;background:linear-gradient(180deg, #3f6faa 0%, #265d99 45%, #183865 100%);color:#ffffff;">
      <div style="font-size:22px;font-weight:700;">NutriCare</div>
      <div style="font-size:18px;font-weight:600;margin-top:8px;">Plano alimentar enviado para download</div>
      <div style="font-size:12px;line-height:1.7;margin-top:10px;color:#dbe8f7;">
        Paciente: ${escapeHtml(paciente.nome || nomePaciente)}<br>
        ${dataNascimento ? `Nascimento: ${formatDate(dataNascimento)}<br>` : ""}
        Peso: ${Number(pesoKg || 0).toFixed(1).replace(".", ",")} kg &nbsp;|&nbsp; Altura: ${Math.round(alturaCm || 0)} cm &nbsp;|&nbsp; Sexo: ${escapeHtml(sexoPaciente || "—")}
      </div>
    </div>

    <div style="padding:24px 28px 12px;">
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        Os layouts do plano alimentar, da lista de compras e das orientações seguem anexados em PDF para o paciente baixar diretamente pelo e-mail.
      </div>
    </div>

    ${messageHtml}

    <div style="margin:18px 28px 28px;padding:16px 18px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
      <div style="font-size:15px;font-weight:700;color:#166534;margin-bottom:8px;">Arquivos enviados</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.8;color:#166534;">
        ${emailSummaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  </div>
</body>
</html>`;

    try {
      const transporter = await getTransporter({
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
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
