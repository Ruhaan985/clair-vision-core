// Client-side PDF & PPTX builders driven by AI tool output.
import { jsPDF } from "jspdf";
import PptxGenJS from "pptxgenjs";

export type PdfPayload = {
  kind: "pdf";
  title: string;
  subtitle?: string;
  // Legacy structured content — kept for backward compatibility.
  sections?: Array<{ heading: string; content: string }>;
  // Flexible block-based content so the AI can render worksheets, resumes,
  // letters, invoices, etc. — not just a fixed "sections" layout.
  blocks?: Array<PdfBlock>;
  docKind?: string; // e.g. "worksheet", "resume", "letter", "invoice", "report"
};

export type PdfBlock =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "questions"; items: string[]; numbered?: boolean; answerLines?: number }
  | { type: "divider" }
  | { type: "spacer"; size?: number }
  | { type: "kv"; pairs: Array<{ label: string; value: string }> }
  | { type: "quote"; text: string };

export type PptxSlideLayout =
  | "split"
  | "image-left"
  | "hero"
  | "stats"
  | "quote"
  | "two-column"
  | "bullets";

export type PptxSlide = {
  layout?: PptxSlideLayout;
  title: string;
  bullets: string[];
  notes?: string;
  imageUrl?: string;
  imagePrompt?: string;
  stats?: Array<{ value: string; label: string }>;
  quote?: string;
  attribution?: string;
  columns?: Array<{ heading: string; bullets: string[] }>;
};

export type PptxPayload = {
  kind: "pptx";
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  slides: PptxSlide[];
};

export type StoryboardPayload = {
  kind: "storyboard";
  title: string;
  logline: string;
  durationSeconds?: number;
  scenes: Array<{
    scene: string;
    visual: string;
    voiceover?: string;
    seconds?: number;
    imageUrl?: string;
    imagePrompt?: string;
  }>;
};

const sanitize = (s: string) =>
  s.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "lumen";

export function buildAndDownloadPdf(p: PdfPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  let y = M;

  // Mint accent bar
  doc.setFillColor(110, 231, 183);
  doc.rect(0, 0, W, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 30, 40);
  const titleLines = doc.splitTextToSize(p.title, W - M * 2);
  doc.text(titleLines, M, y + 18);
  y += 18 + titleLines.length * 24;

  if (p.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(110, 120, 130);
    const sub = doc.splitTextToSize(p.subtitle, W - M * 2);
    doc.text(sub, M, y);
    y += sub.length * 16 + 8;
  }

  doc.setDrawColor(225);
  doc.line(M, y, W - M, y);
  y += 24;

  // Prefer flexible blocks; fall back to legacy sections.
  const blocks: PdfBlock[] =
    p.blocks && p.blocks.length
      ? p.blocks
      : (p.sections ?? []).flatMap((s) => [
          { type: "heading", text: s.heading, level: 2 } as PdfBlock,
          { type: "paragraph", text: s.content } as PdfBlock,
        ]);

  const ensure = (need: number) => {
    if (y > H - M - need) {
      doc.addPage();
      y = M;
    }
  };
  const drawText = (
    text: string,
    opts: { size: number; bold?: boolean; color?: [number, number, number]; indent?: number; lineHeight?: number },
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size);
    const [r, g, b] = opts.color ?? [40, 50, 60];
    doc.setTextColor(r, g, b);
    const indent = opts.indent ?? 0;
    const lh = opts.lineHeight ?? opts.size + 4;
    const lines = doc.splitTextToSize(text, W - M * 2 - indent);
    for (const line of lines) {
      ensure(lh);
      doc.text(line, M + indent, y);
      y += lh;
    }
  };

  for (const b of blocks) {
    switch (b.type) {
      case "heading": {
        const level = b.level ?? 2;
        const size = level === 1 ? 18 : level === 2 ? 14 : 12;
        y += level === 1 ? 8 : 4;
        ensure(size + 10);
        drawText(b.text, { size, bold: true, color: [20, 30, 40], lineHeight: size + 6 });
        y += 4;
        break;
      }
      case "paragraph": {
        const paras = b.text.split(/\n{2,}/);
        for (const para of paras) {
          drawText(para.replace(/\s+\n/g, "\n"), { size: 11, color: [55, 65, 75], lineHeight: 15 });
          y += 6;
        }
        break;
      }
      case "list": {
        b.items.forEach((item, i) => {
          const bullet = b.ordered ? `${i + 1}.` : "•";
          ensure(16);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(55, 65, 75);
          doc.text(bullet, M, y);
          drawText(item, { size: 11, color: [55, 65, 75], indent: 20, lineHeight: 15 });
          y += 2;
        });
        y += 6;
        break;
      }
      case "questions": {
        const numbered = b.numbered !== false;
        const answerLines = Math.max(0, b.answerLines ?? 3);
        b.items.forEach((q, i) => {
          const label = numbered ? `${i + 1}. ` : "• ";
          ensure(20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(20, 30, 40);
          doc.text(label, M, y);
          drawText(q, { size: 11, bold: true, color: [20, 30, 40], indent: 20, lineHeight: 15 });
          y += 6;
          // Answer lines
          for (let ln = 0; ln < answerLines; ln++) {
            ensure(18);
            doc.setDrawColor(210);
            doc.line(M + 20, y + 8, W - M, y + 8);
            y += 18;
          }
          y += 8;
        });
        break;
      }
      case "kv": {
        b.pairs.forEach((kv) => {
          ensure(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(20, 30, 40);
          doc.text(`${kv.label}:`, M, y);
          const labelW = doc.getTextWidth(`${kv.label}:`) + 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 75);
          const lines = doc.splitTextToSize(kv.value, W - M * 2 - labelW);
          doc.text(lines[0] ?? "", M + labelW, y);
          y += 15;
          for (let i = 1; i < lines.length; i++) {
            ensure(15);
            doc.text(lines[i], M + labelW, y);
            y += 15;
          }
          y += 2;
        });
        y += 4;
        break;
      }
      case "quote": {
        ensure(20);
        doc.setDrawColor(110, 231, 183);
        doc.setLineWidth(2);
        const startY = y;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(80, 90, 100);
        const lines = doc.splitTextToSize(b.text, W - M * 2 - 16);
        for (const line of lines) {
          ensure(15);
          doc.text(line, M + 16, y);
          y += 15;
        }
        doc.line(M + 4, startY - 10, M + 4, y - 6);
        doc.setLineWidth(1);
        y += 6;
        break;
      }
      case "divider": {
        ensure(12);
        doc.setDrawColor(225);
        doc.line(M, y, W - M, y);
        y += 12;
        break;
      }
      case "spacer": {
        y += b.size ?? 12;
        break;
      }
    }
  }

  doc.save(`${sanitize(p.title)}.pdf`);
}

// Aster palette for exported decks.
const P = {
  bg: "05060A",
  panel: "0D1018",
  border: "1E2230",
  text: "EDEEF2",
  muted: "8890A0",
  dim: "4D5364",
  glow: "B9C4E0",
};
const HEAD = "Georgia";
const BODY = "Calibri";

export async function buildAndDownloadPptx(p: PptxPayload) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = p.title;
  pptx.author = "Lumen";
  const W = 13.33;
  const H = 7.5;
  const total = p.slides.length + 3;
  const RECT = pptx.ShapeType.rect;

  pptx.defineSlideMaster({
    title: "ASTER",
    background: { color: P.bg },
    objects: [
      { rect: { x: 0.6, y: 6.95, w: W - 1.2, h: 0.01, fill: { color: P.border } } },
      {
        text: {
          text: "Lumen",
          options: { x: 0.6, y: 7.0, w: 3, h: 0.3, color: P.dim, fontSize: 9, fontFace: BODY, italic: true },
        },
      },
    ],
    slideNumber: { x: W - 1.4, y: 7.0, w: 0.8, h: 0.3, color: P.dim, fontSize: 9, fontFace: BODY, align: "right" },
  });

  // Fetch every image up front, in parallel.
  const [cover, ...images] = await Promise.all([
    p.coverImageUrl ? imageToDataUrl(p.coverImageUrl) : Promise.resolve(null),
    ...p.slides.map((s) => (s.imageUrl ? imageToDataUrl(s.imageUrl) : Promise.resolve(null))),
  ]);

  const kicker = (slide: PptxGenJS.Slide, text: string, x = 0.6, y = 0.45) =>
    slide.addText(text.toUpperCase(), {
      x, y, w: 6, h: 0.3, fontSize: 10, color: P.glow, fontFace: BODY, bold: true, charSpacing: 4,
    });
  const heading = (slide: PptxGenJS.Slide, text: string, x: number, w: number, y = 0.8, size = 30) =>
    slide.addText(text, {
      x, y, w, h: 1.1, fontSize: size, color: P.text, fontFace: HEAD, italic: true, valign: "top", fit: "shrink",
    });
  const bulletBox = (slide: PptxGenJS.Slide, items: string[], x: number, y: number, w: number, h: number, size = 18) => {
    if (!items.length) return;
    slide.addText(
      items.map((b) => ({ text: b, options: { bullet: { code: "2014" }, breakLine: true } })),
      { x, y, w, h, fontSize: size, color: P.text, fontFace: BODY, paraSpaceAfter: 12, valign: "top", fit: "shrink" },
    );
  };
  const photo = (slide: PptxGenJS.Slide, data: string, x: number, y: number, w: number, h: number) => {
    slide.addImage({ data, x, y, w, h, sizing: { type: "cover", w, h } });
    slide.addShape(RECT, { x, y, w, h, fill: { color: P.bg, transparency: 100 }, line: { color: P.border, width: 0.75 } });
  };

  // 1. Cover
  const c = pptx.addSlide({ masterName: "ASTER" });
  if (cover) {
    c.addImage({ data: cover, x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
    c.addShape(RECT, { x: 0, y: 0, w: W, h: H, fill: { color: P.bg, transparency: 35 } });
    c.addShape(RECT, { x: 0, y: H * 0.45, w: W, h: H * 0.55, fill: { color: P.bg, transparency: 15 } });
  }
  kicker(c, "Presentation", 0.8, 3.7);
  c.addText(p.title, { x: 0.8, y: 4.0, w: 11.5, h: 1.6, fontSize: 46, color: P.text, fontFace: HEAD, italic: true, fit: "shrink", valign: "top" });
  if (p.subtitle) {
    c.addText(p.subtitle, { x: 0.8, y: 5.6, w: 11, h: 0.6, fontSize: 18, color: P.muted, fontFace: BODY });
  }
  c.addText(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), {
    x: 0.8, y: 6.3, w: 6, h: 0.4, fontSize: 11, color: P.dim, fontFace: BODY,
  });

  // 2. Agenda
  const ag = pptx.addSlide({ masterName: "ASTER" });
  kicker(ag, "Agenda");
  heading(ag, "What we'll cover", 0.6, 12);
  const items = p.slides.map((s) => s.title);
  const half = Math.ceil(items.length / 2);
  [items.slice(0, half), items.slice(half)].forEach((col, ci) => {
    col.forEach((t, i) => {
      const n = ci * half + i + 1;
      const y = 2.1 + i * 0.58;
      ag.addText(String(n).padStart(2, "0"), { x: 0.6 + ci * 6.2, y, w: 0.7, h: 0.45, fontSize: 16, color: P.glow, fontFace: HEAD, italic: true });
      ag.addText(t, { x: 1.3 + ci * 6.2, y, w: 5.2, h: 0.45, fontSize: 15, color: P.text, fontFace: BODY, fit: "shrink" });
    });
  });

  // 3. Content slides
  p.slides.forEach((s, i) => {
    const slide = pptx.addSlide({ masterName: "ASTER" });
    const img = images[i] ?? null;
    const label = `${String(i + 1).padStart(2, "0")} / ${String(p.slides.length).padStart(2, "0")}`;
    let layout: PptxSlideLayout = s.layout ?? (img ? "split" : "bullets");
    if ((layout === "split" || layout === "image-left" || layout === "hero") && !img) layout = "bullets";
    if (layout === "stats" && !s.stats?.length) layout = "bullets";
    if (layout === "quote" && !s.quote) layout = "bullets";
    if (layout === "two-column" && !s.columns?.length) layout = "bullets";

    switch (layout) {
      case "split":
      case "image-left": {
        const left = layout === "image-left";
        const imgX = left ? 0.6 : 7.25;
        const txtX = left ? 6.75 : 0.6;
        photo(slide, img!, imgX, 0.6, 5.5, 6.1);
        kicker(slide, label, txtX);
        heading(slide, s.title, txtX, 6, 0.8, 28);
        bulletBox(slide, s.bullets, txtX, 2.15, 6, 4.5, 17);
        break;
      }
      case "hero": {
        slide.addImage({ data: img!, x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
        slide.addShape(RECT, { x: 0, y: 0, w: W, h: H, fill: { color: P.bg, transparency: 45 } });
        slide.addShape(RECT, { x: 0, y: 4.2, w: W, h: 3.3, fill: { color: P.bg, transparency: 20 } });
        kicker(slide, label, 0.8, 4.45);
        slide.addText(s.title, { x: 0.8, y: 4.8, w: 11.5, h: 1.2, fontSize: 40, color: P.text, fontFace: HEAD, italic: true, fit: "shrink" });
        if (s.bullets[0]) {
          slide.addText(s.bullets.join("  ·  "), { x: 0.8, y: 6.0, w: 11.5, h: 0.7, fontSize: 16, color: P.muted, fontFace: BODY, fit: "shrink" });
        }
        break;
      }
      case "stats": {
        kicker(slide, label);
        heading(slide, s.title, 0.6, 12);
        const stats = s.stats!.slice(0, 4);
        const gap = 0.3;
        const cw = (W - 1.2 - gap * (stats.length - 1)) / stats.length;
        stats.forEach((st, k) => {
          const x = 0.6 + k * (cw + gap);
          slide.addShape(RECT, { x, y: 2.2, w: cw, h: 2.6, fill: { color: P.panel }, line: { color: P.border, width: 0.75 } });
          slide.addText(st.value, { x: x + 0.25, y: 2.45, w: cw - 0.5, h: 1.2, fontSize: 40, color: P.glow, fontFace: HEAD, italic: true, fit: "shrink" });
          slide.addText(st.label, { x: x + 0.25, y: 3.7, w: cw - 0.5, h: 0.9, fontSize: 14, color: P.muted, fontFace: BODY, valign: "top", fit: "shrink" });
        });
        bulletBox(slide, s.bullets.slice(0, 3), 0.6, 5.1, 12, 1.7, 15);
        break;
      }
      case "quote": {
        slide.addText("\u201C", { x: 0.8, y: 0.6, w: 2, h: 1.8, fontSize: 120, color: P.dim, fontFace: HEAD });
        slide.addText(s.quote!, { x: 1.4, y: 2.0, w: 10.5, h: 2.8, fontSize: 30, color: P.text, fontFace: HEAD, italic: true, fit: "shrink", valign: "middle" });
        if (s.attribution) {
          slide.addText(`— ${s.attribution}`, { x: 1.4, y: 5.0, w: 10.5, h: 0.5, fontSize: 16, color: P.glow, fontFace: BODY });
        }
        slide.addText(s.title, { x: 1.4, y: 5.6, w: 10.5, h: 0.5, fontSize: 12, color: P.muted, fontFace: BODY });
        break;
      }
      case "two-column": {
        kicker(slide, label);
        heading(slide, s.title, 0.6, 12);
        s.columns!.slice(0, 2).forEach((col, k) => {
          const x = 0.6 + k * 6.25;
          slide.addShape(RECT, { x, y: 2.1, w: 5.95, h: 4.6, fill: { color: P.panel }, line: { color: P.border, width: 0.75 } });
          slide.addText(col.heading, { x: x + 0.3, y: 2.3, w: 5.4, h: 0.6, fontSize: 20, color: P.glow, fontFace: HEAD, italic: true, fit: "shrink" });
          bulletBox(slide, col.bullets, x + 0.3, 3.0, 5.4, 3.5, 15);
        });
        break;
      }
      default: {
        kicker(slide, label);
        heading(slide, s.title, 0.6, 12);
        bulletBox(slide, s.bullets, 0.6, 2.1, 12, 4.6, 20);
      }
    }
    if (s.notes) slide.addNotes(s.notes);
  });

  // Closing
  const end = pptx.addSlide({ masterName: "ASTER" });
  if (cover) {
    end.addImage({ data: cover, x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
    end.addShape(RECT, { x: 0, y: 0, w: W, h: H, fill: { color: P.bg, transparency: 20 } });
  }
  end.addText("Thank you", { x: 0.8, y: 2.6, w: 11.7, h: 1.4, fontSize: 54, color: P.text, fontFace: HEAD, italic: true, align: "center" });
  end.addText(p.title, { x: 0.8, y: 4.0, w: 11.7, h: 0.6, fontSize: 16, color: P.muted, fontFace: BODY, align: "center" });
  end.addText("Questions & discussion", { x: 0.8, y: 4.6, w: 11.7, h: 0.5, fontSize: 12, color: P.glow, fontFace: BODY, align: "center", charSpacing: 3 });
  void total;

  await pptx.writeFile({ fileName: `${sanitize(p.title)}.pptx` });
}

async function imageToDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
