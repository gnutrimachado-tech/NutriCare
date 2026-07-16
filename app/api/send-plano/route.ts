import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  nutricionistaNome: string;
  nutricionistaCrn: string;
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
const PAGE_MARGIN_X = 30;
const HEADER_TOP = PAGE_HEIGHT - 20;
const HEADER_LINE_Y = HEADER_TOP - 70;   // linha logo abaixo dos dados do paciente
const TITLE_Y = HEADER_LINE_Y - 28.35;   // 1cm abaixo da linha separadora
const CONTENT_TOP = TITLE_Y - 28.35;     // 1cm abaixo do escrito do título
const FOOTER_TOP = 82;                   // rodapé começa aqui
const CONTENT_BOTTOM = 78;              // 0,5mm acima do baseline do texto "Nutricionista" (y≈76)
// Constantes da lista de compras
const SHOP_HEADER_H = 48;              // espaço do cabeçalho dentro do quadrado
const SHOP_LINE_H = 19;               // altura de cada linha de item
const SHOP_BOTTOM_PAD = 20;           // padding inferior do quadrado
const BACKGROUND_OPACITY = 0.15;
const FOOTER_LOGO_OPACITY = 0.15;
const BOX_RADIUS = 8;
const BOX_FILL_OPACITY = 0.40;
const CRN_LABEL = process.env.NUTRICARE_CRN || "CRN:";

const assetCache = new Map<string, Buffer | null>();
let cachedTransporter:
  | { key: string; transporter: { sendMail: (options: Record<string, unknown>) => Promise<unknown> } }
  | null = null;

async function readPublicAssetWithFormat(
  ...candidates: string[]
): Promise<{ data: Buffer; isJpeg: boolean } | null> {
  for (const relativePath of candidates) {
    if (assetCache.has(relativePath)) {
      const cached = assetCache.get(relativePath);
      if (cached) return {
        data: cached,
        isJpeg: relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg"),
      };
      continue;
    }
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    try {
      const buffer = await fs.readFile(absolutePath);
      assetCache.set(relativePath, buffer);
      return {
        data: buffer,
        isJpeg: relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg"),
      };
    } catch {
      assetCache.set(relativePath, null);
    }
  }
  return null;
}

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


// ── Count visual wrapped lines for a list of text strings at meal font size ──
function calcMealColLines(lines: string[], font: PDFFont, colWidth: number): number {
  const MEAL_FONT_SIZE = 8;
  let total = 0;
  for (const line of lines) {
    const wrapped = wrapText(String(line || ""), colWidth, font, MEAL_FONT_SIZE);
    total += Math.max(1, wrapped.length);
  }
  return total;
}

// ── Rounded rectangle helper ──────────────────────────────────────────────────
function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  options: {
    fillColor?: ReturnType<typeof rgb>;
    fillOpacity?: number;
    borderColor?: ReturnType<typeof rgb>;
    borderWidth?: number;
  } = {}
) {
  const r = Math.min(radius, width / 2, height / 2);
  const w = width;
  const h = height;
  // SVG path (y-down) translated by pdf-lib to PDF space (y-up)
  const path = `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} L 0,${r} Q 0,0 ${r},0 Z`;
  page.drawSvgPath(path, {
    x,
    y: y + height,
    color: options.fillColor,
    opacity: options.fillOpacity,
    borderColor: options.borderColor,
    borderWidth: options.borderWidth,
  });
}

// ── Food name helpers ──────────────────────────────────────────────────────────
const PREP_WORDS_SET = new Set([
  "cozido","cozida","cozidos","cozidas",
  "grelhado","grelhada","grelhados","grelhadas",
  "assado","assada","assados","assadas",
  "cru","crua","crus","cruas",
  "congelado","congelada",
  "frito","frita",
  "envasado","envasada",
  "refogado","refogada",
  "moído","moida",
]);

const RAW_WEIGHT_FACTORS: { keywords: string[]; factor: number }[] = [
  { keywords: ["arroz"], factor: 0.38 },
  { keywords: ["feijão","feijao"], factor: 0.42 },
  { keywords: ["lentilha"], factor: 0.4 },
  { keywords: ["ervilha"], factor: 0.4 },
  { keywords: ["macarrão","macarrao","espaguete"], factor: 0.35 },
  { keywords: ["aveia"], factor: 0.4 },
  { keywords: ["quinoa"], factor: 0.35 },
  { keywords: ["grão-de-bico","grao-de-bico"], factor: 0.4 },
];

function getRawWeightFactor(foodName: string): number {
  const lower = foodName.toLowerCase();
  const isCooked = lower.includes("cozido") || lower.includes("cozida");
  if (!isCooked) return 1.0;
  for (const item of RAW_WEIGHT_FACTORS) {
    if (item.keywords.some(k => lower.includes(k))) return item.factor;
  }
  return 1.0;
}

function simplifyFoodName(fullName: string): string {
  if (!fullName) return fullName;
  const parts = fullName.split(",").map(p => p.trim());
  if (parts.length <= 1) return fullName;

  const main = parts[0];
  const variety = parts.length > 1 ? parts[1] : "";
  const sub = parts.length > 2 ? parts[2] : "";

  const isPrepWord = (s: string) => {
    const l = s.toLowerCase();
    return Array.from(PREP_WORDS_SET).some(w => l === w) || l.includes("sem ") || l.includes("com gordura");
  };

  const mainLower = main.toLowerCase();

  if (mainLower === "carne" && variety.toLowerCase() === "bovina" && sub && !isPrepWord(sub)) {
    const cleanSub = sub.split(",")[0].trim();
    if (!isPrepWord(cleanSub)) {
      return cleanSub.charAt(0).toUpperCase() + cleanSub.slice(1).toLowerCase() + " bovino";
    }
    return main + " bovina";
  }

  if (mainLower === "frango" && variety && !isPrepWord(variety)) {
    const varLower = variety.toLowerCase();
    if (varLower === "peito") return "Peito de frango";
    if (varLower === "coxa") return "Coxa de frango";
    if (varLower === "sobrecoxa") return "Sobrecoxa de frango";
    return variety.charAt(0).toUpperCase() + variety.slice(1).toLowerCase() + " de frango";
  }

  if (["arroz","feijão","feijao","lentilha","ervilha","aveia","quinoa","macarrão","macarrao"].some(k => mainLower.includes(k))) {
    const varLower = variety.toLowerCase();
    if (/^tipo \d/.test(varLower) || isPrepWord(variety)) return main;
    return main + " " + variety.toLowerCase();
  }

  if (!isPrepWord(variety)) {
    const varLower = variety.toLowerCase();
    if (/^tipo \d/.test(varLower)) return main;
    if (["suco","concentrado","envasado"].includes(varLower)) {
      return main + " (suco)";
    }
    return main + " " + variety.toLowerCase();
  }

  return main;
}

// ── Structured meal lines (for colored Para X: rendering) ──────────────────────
type SubLine = { isPara: boolean; text: string };

function getMealLinesStructured(meal: EnvioMeal | undefined): { mainLines: string[]; subLines: SubLine[] } {
  const mainLines = (meal?.foods || [])
    .filter(food => food?.name)
    .map(food => `${food.name} — ${String(food.qty ?? "")} ${String(food.unit ?? "").trim()}`.replace(/\s+/g, " ").trim());

  const subLines: SubLine[] = [];
  Object.entries(meal?.subs || {}).forEach(([foodId, subs]) => {
    const validSubs = (subs || []).filter(sub => sub?.name);
    if (validSubs.length === 0) return;
    const mainFood = (meal?.foods || []).find(food => food.id === foodId);
    if (mainFood?.name) {
      subLines.push({ isPara: true, text: `Para ${shortFoodName(mainFood.name)}:` });
    }
    validSubs.forEach(sub => {
      subLines.push({
        isPara: false,
        text: `${sub.name} — ${String(sub.qty ?? "")} ${String(sub.unit ?? "").trim()}`.replace(/\s+/g, " ").trim(),
      });
    });
  });

  return { mainLines, subLines };
}

function drawSubsBlock(params: {
  page: PDFPage;
  doc: LayoutDoc;
  subLines: SubLine[];
  x: number;
  y: number;
  width: number;
  maxHeight: number;
  fontSize: number;
  lineGap: number;
}) {
  const { page, doc, subLines, x, y, width, maxHeight, fontSize, lineGap } = params;
  let cursorY = y;
  let consumed = 0;
  const lineHeight = fontSize + lineGap;

  if (subLines.length === 0) {
    page.drawText("—", { x, y: cursorY, size: fontSize, font: doc.fontBold, color: rgb(0.08, 0.08, 0.08) });
    return;
  }

  for (const subLine of subLines) {
    const font = doc.fontBold;
    const color = subLine.isPara ? rgb(0.08, 0.18, 0.55) : rgb(0.05, 0.05, 0.05);
    const wrapped = wrapText(subLine.text, width, font, fontSize);
    for (const line of wrapped) {
      if (consumed + lineHeight > maxHeight) return;
      page.drawText(line || " ", { x, y: cursorY, size: fontSize, font, color });
      cursorY -= lineHeight;
      consumed += lineHeight;
    }
  }
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

  const [scriptFontBytes, logoBytes] = await Promise.all([
    readPublicAsset("fonts/GreatVibes-Regular.ttf"),
    readPublicAsset("logo-nutricare-ref.png", "layouts/logo-nutricare-ref.png", "logo-nutricare.png"),
  ]);

  const bgResult = await readPublicAssetWithFormat(
    "fundo-layout.jpg",
    "layouts/fundo-layout.jpg",
    "fundo-layout.png",
    "layouts/fundo-layout.png",
    "nutri-coracao.png"
  );

  const fontScript = scriptFontBytes ? await pdf.embedFont(scriptFontBytes) : null;
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null;
  const background = bgResult
    ? bgResult.isJpeg
      ? await pdf.embedJpg(bgResult.data)
      : await pdf.embedPng(bgResult.data)
    : null;

  return { pdf, fontRegular, fontBold, fontScript, logo, background, nutricionistaNome: '', nutricionistaCrn: '' };
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

  // Logo: fundo acima da linha horizontal
  if (doc.logo) {
    const maxLogoHeight = HEADER_TOP - HEADER_LINE_Y - 8;
    const aspectRatio = doc.logo.height / doc.logo.width;
    const targetWidth = Math.min(68, maxLogoHeight / aspectRatio);
    const targetHeight = targetWidth * aspectRatio;
    page.drawImage(doc.logo, {
      x: PAGE_MARGIN_X,
      y: HEADER_LINE_Y + 6,
      width: targetWidth,
      height: targetHeight,
    });
  } else {
    page.drawText("NutriCare", {
      x: PAGE_MARGIN_X,
      y: HEADER_TOP - 22,
      size: 15,
      font: doc.fontBold,
      color: rgb(0.13, 0.2, 0.24),
    });
  }

  const infoX = PAGE_MARGIN_X + 76;
  const patientName = fitText(options.nomePaciente || "Paciente", 240, doc.fontBold, 15);
  page.drawText(patientName, {
    x: infoX,
    y: HEADER_TOP - 28,
    size: 15,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  const infoLine1Parts = [
    options.dataNascimento ? `nascimento: ${formatDate(options.dataNascimento)}` : null,
    options.pesoKg ? `peso: ${Number(options.pesoKg || 0).toFixed(1).replace(".", ",")}kg` : null,
  ].filter(Boolean);
  const infoLine2Parts = [
    options.alturaCm ? `altura: ${Math.round(Number(options.alturaCm || 0)) || 0}cm` : null,
    options.sexoPaciente ? `sexo: ${String(options.sexoPaciente).toLowerCase()}` : null,
  ].filter(Boolean);
  const infoMaxWidth = options.showMetrics ? 315 : 440;

  page.drawText(fitText(infoLine1Parts.join(" | "), infoMaxWidth, doc.fontBold, 10), {
    x: infoX,
    y: HEADER_TOP - 46,
    size: 10,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  if (infoLine2Parts.length > 0) {
    page.drawText(fitText(infoLine2Parts.join(" | "), infoMaxWidth, doc.fontBold, 10), {
      x: infoX,
      y: HEADER_TOP - 60,
      size: 10,
      font: doc.fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });
  }

  if (options.showMetrics) {
    const rightX = PAGE_WIDTH - PAGE_MARGIN_X - 134;
    const metrics = [
      `massa muscular: ${formatMetric(options.massaMuscular, "kg")}`,
      `massa adiposa: ${formatMetric(options.massaAdiposa, "kg")}`,
      `% de gordura: ${formatMetric(options.percGordura, "%")}`,
    ];
    metrics.forEach((line, index) => {
      page.drawText(fitText(line, 132, doc.fontBold, 10), {
        x: rightX,
        y: HEADER_TOP - 22 - index * 14,
        size: 10,
        font: doc.fontBold,
        color: rgb(0.05, 0.05, 0.05),
      });
    });
  }

  page.drawLine({
    start: { x: PAGE_MARGIN_X, y: HEADER_LINE_Y },
    end: { x: PAGE_WIDTH - PAGE_MARGIN_X, y: HEADER_LINE_Y },
    thickness: 1,
    color: rgb(0.15, 0.15, 0.15),
  });

  const titleText = options.title.toUpperCase();
  const titleWidth = doc.fontBold.widthOfTextAtSize(titleText, 20);
  page.drawText(titleText, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: TITLE_Y,
    size: 20,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
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

  const nomeRodape = doc.nutricionistaNome || "Nutricionista";
  const crnRodape = doc.nutricionistaCrn || CRN_LABEL;

  if (doc.fontScript) {
    page.drawText(nomeRodape, {
      x: PAGE_MARGIN_X,
      y: footerY + 20,
      size: 22,
      font: doc.fontScript,
      color: rgb(0.12, 0.12, 0.12),
    });
  } else {
    page.drawText(nomeRodape, {
      x: PAGE_MARGIN_X,
      y: footerY + 20,
      size: 13,
      font: doc.fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });
  }

  page.drawText(crnRodape, {
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
  drawRoundedRect(page, x, y, width, height, BOX_RADIUS, {
    fillColor: rgb(1, 1, 1),
    fillOpacity: BOX_FILL_OPACITY,
    borderColor: rgb(0.15, 0.15, 0.15),
    borderWidth: 1,
  });

  const headerY = y + height - 22;
  page.drawText(fitText(meal?.name || "nome da refeição", width - 92, doc.fontBold, 12), {
    x: x + 13,
    y: headerY,
    size: 12,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawText(fitText(meal?.time || "horário", 58, doc.fontBold, 9.5), {
    x: x + width - 66,
    y: headerY + 0.5,
    size: 9.5,
    font: doc.fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawLine({
    start: { x: x + 13, y: y + height - 30 },
    end: { x: x + width - 13, y: y + height - 30 },
    thickness: 0.8,
    color: rgb(0.2, 0.2, 0.2),
  });

  const innerTop = y + height - 43;
  const colGap = 14;
  const innerWidth = width - 26;
  const colWidth = (innerWidth - colGap) / 2;
  const leftX = x + 13;
  const rightX = leftX + colWidth + colGap;

  page.drawText("principais", {
    x: leftX,
    y: innerTop,
    size: 8.5,
    font: doc.fontBold,
    color: rgb(0.09, 0.58, 0.21),
  });

  page.drawText("substituições", {
    x: rightX,
    y: innerTop,
    size: 8.5,
    font: doc.fontBold,
    color: rgb(0.14, 0.39, 0.84),
  });

  const { mainLines, subLines } = getMealLinesStructured(meal);
  const contentY = innerTop - 13;
  const maxContentHeight = height - 66;

  drawTextBlock({
    page,
    font: doc.fontBold,
    textLines: mainLines.length > 0 ? mainLines : ["—"],
    x: leftX,
    y: contentY,
    width: colWidth,
    maxHeight: maxContentHeight,
    fontSize: 8,
    lineGap: 3.5,
    color: rgb(0.08, 0.08, 0.08),
  });

  drawSubsBlock({
    page,
    doc,
    subLines,
    x: rightX,
    y: contentY,
    width: colWidth,
    maxHeight: maxContentHeight,
    fontSize: 8,
    lineGap: 3.5,
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

  {
    const gridX = PAGE_MARGIN_X - 14;
    const colGap = 11;
    const rowGap = 14;
    const boxWidth = 276;
    const colWidth = (boxWidth - 26 - 14) / 2;
    const MEAL_OVERHEAD = 66;
    const MEAL_BOTTOM_PAD = 10;
    const MEAL_LINE_H = 8 + 3.5;
    const MIN_MEAL_H = 154;  // reduzido 1cm (28pt) conforme solicitado

    const allMeals = chunks.flat();
    const rows: Array<[EnvioMeal | undefined, EnvioMeal | undefined]> = [];
    for (let i = 0; i < Math.max(allMeals.length, 2); i += 2) {
      rows.push([allMeals[i], allMeals[i + 1]]);
    }

    let mealPage: PDFPage | null = null;
    let mealPageY = 0;

    const addPage = () => {
      mealPage = addBasePage(doc, {
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
      mealPageY = Math.round(CONTENT_TOP);
    };

    addPage();

    for (const [mealA, mealB] of rows) {
      const calcH = (m: EnvioMeal | undefined) => {
        const { mainLines, subLines } = getMealLinesStructured(m);
        const mainCount = calcMealColLines(mainLines.length > 0 ? mainLines : ["—"], doc.fontBold, colWidth);
        const subLineTexts = subLines.map(s => s.text);
        const subCount = calcMealColLines(subLineTexts.length > 0 ? subLineTexts : ["—"], doc.fontBold, colWidth);
        return Math.max(MIN_MEAL_H, MEAL_OVERHEAD + Math.max(mainCount, subCount) * MEAL_LINE_H + MEAL_BOTTOM_PAD);
      };
      const rowHeight = Math.max(calcH(mealA), calcH(mealB));

      if (mealPage && mealPageY - rowHeight < CONTENT_BOTTOM + rowGap) {
        addPage();
      }

      const y = mealPageY - rowHeight;
      drawMealBox(doc, mealPage!, gridX, y, boxWidth, rowHeight, mealA);
      drawMealBox(doc, mealPage!, gridX + boxWidth + colGap, y, boxWidth, rowHeight, mealB);
      mealPageY -= rowHeight + rowGap;
    }
  }

  return Buffer.from(await doc.pdf.save());
}

// Cache global para assets compartilhados entre chamadas
let cachedAssets: { logo: Buffer | null; background: Buffer | null; fontScript: Buffer | null; backgroundIsJpeg: boolean } | null = null;

async function preloadAssets(): Promise<{ logo: Buffer | null; background: Buffer | null; fontScript: Buffer | null; backgroundIsJpeg: boolean }> {
  if (cachedAssets) return cachedAssets;

  const [fontScript, logo] = await Promise.all([
    readPublicAsset("fonts/GreatVibes-Regular.ttf"),
    readPublicAsset("logo-nutricare-ref.png", "layouts/logo-nutricare-ref.png", "logo-nutricare.png"),
  ]);

  const bgResult = await readPublicAssetWithFormat(
    "fundo-layout.jpg",
    "layouts/fundo-layout.jpg",
    "fundo-layout.png",
    "layouts/fundo-layout.png",
    "nutri-coracao.png"
  );

  cachedAssets = {
    fontScript,
    logo,
    background: bgResult ? bgResult.data : null,
    backgroundIsJpeg: bgResult ? bgResult.isJpeg : false,
  };
  return cachedAssets;
}

// Função para criar documento PDF com assets pré-carregados
async function createLayoutDocOptimized(): Promise<LayoutDoc> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const assets = await preloadAssets();

  const fontScript = assets.fontScript ? await pdf.embedFont(assets.fontScript) : null;
  const logo = assets.logo ? await pdf.embedPng(assets.logo) : null;
  const background = assets.background
    ? assets.backgroundIsJpeg
      ? await pdf.embedJpg(assets.background)
      : await pdf.embedPng(assets.background)
    : null;

  return { pdf, fontRegular, fontBold, fontScript, logo, background, nutricionistaNome: '', nutricionistaCrn: '' };
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
  nutricionistaNome?: string;
  nutricionistaCrn?: string;
}): Promise<{ planoPdf: Buffer; shoppingPdf: Buffer | null; protocolsPdf: Buffer | null }> {
  // Pré-carregar assets UMA vez
  await preloadAssets();
  
  // Criar documentos para cada tipo de PDF
  const [planoDoc, shoppingDoc, protocolsDoc] = await Promise.all([
    createLayoutDocOptimized(),
    params.includeShoppingList ? createLayoutDocOptimized() : Promise.resolve(null),
    params.includeProtocols ? createLayoutDocOptimized() : Promise.resolve(null),
  ]);

  // Injetar dados do nutricionista em cada doc
  const nutricionistaNome = params.nutricionistaNome || '';
  const nutricionistaCrn = params.nutricionistaCrn || '';
  planoDoc.nutricionistaNome = nutricionistaNome;
  planoDoc.nutricionistaCrn = nutricionistaCrn;
  if (shoppingDoc) {
    shoppingDoc.nutricionistaNome = nutricionistaNome;
    shoppingDoc.nutricionistaCrn = nutricionistaCrn;
  }
  if (protocolsDoc) {
    protocolsDoc.nutricionistaNome = nutricionistaNome;
    protocolsDoc.nutricionistaCrn = nutricionistaCrn;
  }

  // Gerar páginas do Plano Alimentar
  const chunks: EnvioMeal[][] = [];
  const meals = params.meals.length > 0 ? params.meals : [];
  for (let index = 0; index < Math.max(meals.length, 1); index += 6) {
    chunks.push(meals.slice(index, index + 6));
  }

  {
    const gridX = PAGE_MARGIN_X - 14;
    const colGap = 11;
    const rowGap = 14;
    const boxWidth = 276;
    const colWidth = (boxWidth - 26 - 14) / 2; // matches drawMealBox inner colWidth
    const MEAL_OVERHEAD = 66;
    const MEAL_BOTTOM_PAD = 10;
    const MEAL_LINE_H = 8 + 3.5;
    const MIN_MEAL_H = 154;  // reduzido 1cm (28pt) conforme solicitado

    // Build list of all meals as rows of 2
    const allMeals = chunks.flat();
    const rows: Array<[EnvioMeal | undefined, EnvioMeal | undefined]> = [];
    for (let i = 0; i < Math.max(allMeals.length, 2); i += 2) {
      rows.push([allMeals[i], allMeals[i + 1]]);
    }

    let mealPage: PDFPage | null = null;
    let mealPageY = 0;

    const addMealPage = () => {
      mealPage = planoDoc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawHeader(planoDoc, mealPage, {
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
      drawFooter(planoDoc, mealPage);
      mealPageY = Math.round(CONTENT_TOP);
    };

    addMealPage();

    for (const [mealA, mealB] of rows) {
      const calcH = (m: EnvioMeal | undefined) => {
        const { mainLines, subLines } = getMealLinesStructured(m);
        const mainCount = calcMealColLines(mainLines.length > 0 ? mainLines : ["—"], planoDoc.fontBold, colWidth);
        const subLineTexts = subLines.map(s => s.text);
        const subCount = calcMealColLines(subLineTexts.length > 0 ? subLineTexts : ["—"], planoDoc.fontBold, colWidth);
        return Math.max(MIN_MEAL_H, MEAL_OVERHEAD + Math.max(mainCount, subCount) * MEAL_LINE_H + MEAL_BOTTOM_PAD);
      };
      const rowHeight = Math.max(calcH(mealA), calcH(mealB));

      if (mealPage && mealPageY - rowHeight < CONTENT_BOTTOM + rowGap) {
        addMealPage();
      }

      const y = mealPageY - rowHeight;
      drawMealBox(planoDoc, mealPage!, gridX, y, boxWidth, rowHeight, mealA);
      drawMealBox(planoDoc, mealPage!, gridX + boxWidth + colGap, y, boxWidth, rowHeight, mealB);
      mealPageY -= rowHeight + rowGap;
    }
  }

  // Gerar páginas da Lista de Compras
  let shoppingPdf: Buffer | null = null;
  if (shoppingDoc && params.includeShoppingList) {
    const items = params.shoppingList.length > 0 ? params.shoppingList : [{ name: "Nenhum item disponível", displayQty: "—" }];
    // Items por página baseado na altura dinâmica do quadrado
    const maxBoxH = CONTENT_TOP - CONTENT_BOTTOM - 4;
    const shoppingPerPage = Math.max(1, Math.floor((maxBoxH - SHOP_HEADER_H - SHOP_BOTTOM_PAD) / SHOP_LINE_H));

    for (let start = 0; start < items.length; start += shoppingPerPage) {
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
      drawShoppingFrame(shoppingDoc, page, items.slice(start, start + shoppingPerPage), params.shoppingDays);
      drawFooter(shoppingDoc, page);
    }
    shoppingPdf = Buffer.from(await shoppingDoc.pdf.save());
  }

  // Gerar páginas de Orientações
  let protocolsPdf: Buffer | null = null;
  if (protocolsDoc && params.includeProtocols) {
    const protos = params.protocols.length > 0 ? params.protocols : [{ name: "Sem orientações", content: "" }];
    const protoPerPage = 6;
    const protoBoxHeight = 82;
    const protoGap = 14;

    {
      const protoBoxX = PAGE_MARGIN_X + 4;
      const protoBoxWidth = PAGE_WIDTH - (PAGE_MARGIN_X + 4) * 2;
      let protoPage = protocolsDoc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawHeader(protocolsDoc, protoPage, {
        title: "orientações",
        nomePaciente: params.nomePaciente,
        dataNascimento: params.dataNascimento,
        sexoPaciente: params.sexoPaciente,
        pesoKg: params.pesoKg,
        alturaCm: params.alturaCm,
        showMetrics: false,
      });
      drawFooter(protocolsDoc, protoPage);
      let protoCurrentY = Math.round(CONTENT_TOP);

      for (const protocol of protos) {
        // Limite de 500 caracteres por quadrado de orientação
        const limitedContent = (protocol.content || "").slice(0, 500);
        const limitedProtocol = { ...protocol, content: limitedContent };
        const boxHeight = calcProtocolBoxHeight(limitedContent, protocolsDoc.fontRegular, protoBoxWidth);
        if (protoCurrentY - boxHeight < CONTENT_BOTTOM + protoGap) {
          protoPage = protocolsDoc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          drawHeader(protocolsDoc, protoPage, {
            title: "orientações",
            nomePaciente: params.nomePaciente,
            dataNascimento: params.dataNascimento,
            sexoPaciente: params.sexoPaciente,
            pesoKg: params.pesoKg,
            alturaCm: params.alturaCm,
            showMetrics: false,
          });
          drawFooter(protocolsDoc, protoPage);
          protoCurrentY = Math.round(CONTENT_TOP);
        }
        drawProtocolBox(protocolsDoc, protoPage, protoBoxX, protoCurrentY - boxHeight, protoBoxWidth, boxHeight, limitedProtocol);
        protoCurrentY -= boxHeight + protoGap;
      }
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
  const boxX = PAGE_MARGIN_X + 4;
  const boxWidth = PAGE_WIDTH - (PAGE_MARGIN_X + 4) * 2;

  // Altura dinâmica: quadrado acompanha o conteúdo, limitado pelo espaço disponível
  const maxBoxH = CONTENT_TOP - CONTENT_BOTTOM - 4;
  const dynH = SHOP_HEADER_H + items.length * SHOP_LINE_H + SHOP_BOTTOM_PAD;
  const boxHeight = Math.min(dynH, maxBoxH);
  const boxY = CONTENT_TOP - boxHeight;  // ancorado no topo (CONTENT_TOP)

  drawRoundedRect(page, boxX, boxY, boxWidth, boxHeight, BOX_RADIUS, {
    fillColor: rgb(1, 1, 1),
    fillOpacity: BOX_FILL_OPACITY,
    borderColor: rgb(0.16, 0.16, 0.16),
    borderWidth: 1,
  });

  page.drawText(`quantidades totais para ${shoppingDays} dias - quantidades do alimento cru ou em natura`, {
    x: boxX + 18,
    y: boxY + boxHeight - 26,
    size: 10,
    font: doc.fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  let cursorY = boxY + boxHeight - SHOP_HEADER_H;

  items.forEach((item) => {
    if (cursorY < boxY + SHOP_BOTTOM_PAD) return;

    page.drawCircle({
      x: boxX + 16,
      y: cursorY + 5,
      size: 3.5,
      color: rgb(0.17, 0.63, 0.28),
    });

    // Simplified name + raw weight conversion
    const simpleName = simplifyFoodName(item.name);
    const rawFactor = getRawWeightFactor(item.name);
    let qtyText: string;
    if (rawFactor < 1.0 && typeof item.qty === "number" && item.qty > 0) {
      const rawQty = Math.round(item.qty * rawFactor);
      if ((item.unit === "g" || !item.unit) && rawQty > 900) {
        const kg = Math.floor(rawQty / 1000);
        const gRest = rawQty % 1000;
        qtyText = gRest > 0 ? `${kg}kg e ${gRest}g` : `${kg}kg`;
      } else {
        qtyText = `${rawQty} ${item.unit || "g"}`;
      }
    } else {
      qtyText = item.displayQty || `${item.qty ?? ""} ${item.unit ?? ""}`.trim();
    }

    const maxLabelWidth = boxWidth - 60;
    const nameLines = wrapText(simpleName, maxLabelWidth, doc.fontBold, 11.5);
    const firstLine = nameLines[0] || simpleName;

    // Cálculo correto dos pontilhados: preenchem do fim do nome até o início da quantidade
    const nameW = doc.fontBold.widthOfTextAtSize(firstLine, 11.5);
    const qtyW = doc.fontBold.widthOfTextAtSize(qtyText, 11.5);
    const dotW = doc.fontRegular.widthOfTextAtSize(".", 11.5);
    // nameStartX = boxX + 24; qtyEndX = boxX + boxWidth - 18
    // dotsArea = boxWidth - 24 - 18 - nameW - qtyW - 4 (4pt buffer)
    const dotsAreaWidth = boxWidth - 24 - 18 - nameW - qtyW - 4;
    const dotCount = Math.max(2, Math.floor(dotsAreaWidth / dotW));
    const dots = ".".repeat(dotCount);

    // Desenha nome
    page.drawText(firstLine, {
      x: boxX + 24,
      y: cursorY,
      size: 11.5,
      font: doc.fontBold,
      color: rgb(0.08, 0.08, 0.08),
    });

    // Desenha pontilhados logo após o nome (encostando na quantidade)
    page.drawText(dots, {
      x: boxX + 24 + nameW + 1,
      y: cursorY,
      size: 11.5,
      font: doc.fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Desenha quantidade alinhada à direita do quadrado
    page.drawText(qtyText, {
      x: boxX + boxWidth - 18 - qtyW,
      y: cursorY,
      size: 11.5,
      font: doc.fontBold,
      color: rgb(0.08, 0.08, 0.08),
    });

    cursorY -= SHOP_LINE_H;

    // Linhas adicionais do nome (quebra de linha)
    for (let ni = 1; ni < nameLines.length; ni++) {
      if (cursorY < boxY + SHOP_BOTTOM_PAD) break;
      page.drawText(nameLines[ni], {
        x: boxX + 24,
        y: cursorY,
        size: 11.5,
        font: doc.fontBold,
        color: rgb(0.08, 0.08, 0.08),
      });
      cursorY -= SHOP_LINE_H;
    }
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
  const maxBoxH = CONTENT_TOP - CONTENT_BOTTOM - 4;
  const perPage = Math.max(1, Math.floor((maxBoxH - SHOP_HEADER_H - SHOP_BOTTOM_PAD) / SHOP_LINE_H));

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


// ── Calculate dynamic height for a protocol box based on content ──────────────
function calcProtocolBoxHeight(content: string | undefined | null, font: PDFFont, boxWidth: number): number {
  const PROTO_OVERHEAD = 48;    // header name + divider + spacing + bottom pad
  const PROTO_LINE_H = 9 + 3.5; // font size + line gap (matches drawProtocolBox)
  const PROTO_MIN_H = 82;       // minimum height (former fixed value)
  const contentWidth = boxWidth - 20;
  if (!content || content.trim() === "") return PROTO_MIN_H;
  const lines = wrapText(content, contentWidth, font, 9);
  return Math.max(PROTO_MIN_H, Math.ceil(PROTO_OVERHEAD + Math.max(1, lines.length) * PROTO_LINE_H));
}

function drawProtocolBox(doc: LayoutDoc, page: PDFPage, x: number, y: number, width: number, height: number, protocol?: Protocol) {
  drawRoundedRect(page, x, y, width, height, BOX_RADIUS, {
    fillColor: rgb(1, 1, 1),
    fillOpacity: BOX_FILL_OPACITY,
    borderColor: rgb(0.16, 0.16, 0.16),
    borderWidth: 1,
  });

  const nameText = fitText(protocol?.name || "orientação", width - 20, doc.fontBold, 10.5);
  page.drawText(nameText, {
    x: x + 10,
    y: y + height - 18,
    size: 10.5,
    font: doc.fontBold,
    color: rgb(0.08, 0.08, 0.08),
  });

  page.drawLine({
    start: { x: x + 10, y: y + height - 25 },
    end: { x: x + width - 10, y: y + height - 25 },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });

  const contentLines = protocol?.content
    ? wrapText(protocol.content, width - 20, doc.fontRegular, 9)
    : [];

  drawTextBlock({
    page,
    font: doc.fontRegular,
    textLines: contentLines,
    x: x + 10,
    y: y + height - 38,
    width: width - 20,
    maxHeight: height - 46,
    fontSize: 9,
    lineGap: 3.5,
    color: rgb(0.12, 0.12, 0.12),
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
  {
    const boxX = PAGE_MARGIN_X + 4;
    const boxWidth = PAGE_WIDTH - (PAGE_MARGIN_X + 4) * 2;
    const gap = 14;
    let page = addBasePage(doc, {
      title: "orientações",
      nomePaciente: params.nomePaciente,
      dataNascimento: params.dataNascimento,
      sexoPaciente: params.sexoPaciente,
      pesoKg: params.pesoKg,
      alturaCm: params.alturaCm,
      showMetrics: false,
    });
    let currentY = Math.round(CONTENT_TOP);

    for (const protocol of protocols) {
      // Limite de 500 caracteres por quadrado de orientação
      const limitedContent = (protocol.content || "").slice(0, 500);
      const limitedProtocol = { ...protocol, content: limitedContent };
      const boxHeight = calcProtocolBoxHeight(limitedContent, doc.fontRegular, boxWidth);
      if (currentY - boxHeight < CONTENT_BOTTOM + gap) {
        page = addBasePage(doc, {
          title: "orientações",
          nomePaciente: params.nomePaciente,
          dataNascimento: params.dataNascimento,
          sexoPaciente: params.sexoPaciente,
          pesoKg: params.pesoKg,
          alturaCm: params.alturaCm,
          showMetrics: false,
        });
        currentY = Math.round(CONTENT_TOP);
      }
      drawProtocolBox(doc, page, boxX, currentY - boxHeight, boxWidth, boxHeight, limitedProtocol);
      currentY -= boxHeight + gap;
    }
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
    connectionTimeout: 8000,
    socketTimeout: 10000,
    greetingTimeout: 8000,
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
      "PDF do plano alimentar",
      ...(includeShoppingList && shoppingList.length > 0 ? [`PDF da lista de compras (${shoppingDays} dias)`] : []),
      ...(includeProtocols && protocols.length > 0 ? ["PDF das orientações"] : []),
      ...(uploadedFiles.length > 0 ? ["arquivos complementares anexados"] : []),
    ];

    // Buscar dados do nutricionista logado para o rodapé do PDF
    let nutricionistaNome = "";
    let nutricionistaCrn = "";
    const session = await getServerSession(authOptions);
    const nutricionistaId = session?.user ? (session.user as { id?: string }).id : undefined;
    if (nutricionistaId) {
      const nutri = await prisma.nutricionistas.findUnique({
        where: { id: nutricionistaId },
        select: { nome: true, crn: true },
      });
      if (nutri) {
        nutricionistaNome = nutri.nome;
        nutricionistaCrn = nutri.crn ? `CRN: ${nutri.crn}` : "";
      }
    }

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
      nutricionistaNome,
      nutricionistaCrn,
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
      <div style="font-size:24px;font-weight:700;">NutriCare</div>
      <div style="font-size:16px;font-weight:600;margin-top:4px;">Plano alimentar enviado para download</div>
      <div style="font-size:13px;line-height:1.7;margin-top:8px;color:#dbe8f7;">
        Paciente: ${escapeHtml(paciente.nome || nomePaciente)}
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
      const resendApiKey = process.env.RESEND_API_KEY;

      const brevoApiKey = process.env.BREVO_API_KEY;

      if (brevoApiKey) {
        // ── Brevo API (HTTPS porta 443 — envia para qualquer destinatário sem domínio próprio) ──
        const brevoFromEmail = process.env.BREVO_FROM_EMAIL || smtpUser || "";
        const brevoFromName = process.env.BREVO_FROM_NAME || "NutriCare";
        const body = {
          sender: { name: brevoFromName, email: brevoFromEmail },
          to: [{ email: paciente.email, name: paciente.nome || nomePaciente }],
          subject: `Plano Alimentar — ${nomePaciente}`,
          htmlContent: html,
          attachment: mailAttachments.map((a) => ({
            name: a.filename,
            content: a.content.toString("base64"),
          })),
        };

        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error((err as { message?: string }).message || `Brevo HTTP ${res.status}`);
        }
      } else if (resendApiKey) {
        // ── Resend API (HTTPS porta 443 — requer domínio verificado para enviar a terceiros) ──
        const resendFrom = process.env.RESEND_FROM || "NutriCare <onboarding@resend.dev>";
        const body = {
          from: resendFrom,
          to: [paciente.email],
          subject: `Plano Alimentar — ${nomePaciente}`,
          html,
          attachments: mailAttachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
          })),
        };

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error((err as { message?: string }).message || `Resend HTTP ${res.status}`);
        }
      } else {
        // ── SMTP (nodemailer) — fallback quando nenhuma API key estiver definida ──
        const transporter = await getTransporter({ smtpHost, smtpPort, smtpUser, smtpPass });
        await transporter.sendMail({
          from: `"NutriCare" <${smtpUser}>`,
          to: paciente.email,
          subject: `Plano Alimentar — ${nomePaciente}`,
          html,
          attachments: mailAttachments,
        });
      }

      return NextResponse.json({
        message: `Plano enviado para ${paciente.email} com sucesso! Os PDFs seguem anexados para download.`,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao enviar email:", error);
      return NextResponse.json(
        { error: `Falha ao enviar o email: ${errMsg}` },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Erro ao enviar plano:", err);
    return NextResponse.json({ error: "Erro interno ao processar envio." }, { status: 500 });
  }
}
