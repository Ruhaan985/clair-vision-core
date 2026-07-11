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

export type PptxPayload = {
  kind: "pptx";
  title: string;
  subtitle?: string;
  slides: Array<{ title: string; bullets: string[]; notes?: string }>;
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

export async function buildAndDownloadPptx(p: PptxPayload) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.defineSlideMaster({
    title: "MINT",
    background: { color: "0B1418" },
    objects: [
      { rect: { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: "6EE7B7" } } },
      {
        text: {
          text: "Lumen",
          options: {
            x: 12.6,
            y: 7.0,
            w: 0.5,
            h: 0.3,
            color: "6EE7B7",
            fontSize: 10,
          },
        },
      },
    ],
  });

  const title = pptx.addSlide({ masterName: "MINT" });
  title.addText(p.title, {
    x: 0.6,
    y: 2.6,
    w: 12,
    h: 1.6,
    fontSize: 48,
    bold: true,
    color: "F0FDF4",
    fontFace: "Calibri",
  });
  if (p.subtitle) {
    title.addText(p.subtitle, {
      x: 0.6,
      y: 4.2,
      w: 12,
      h: 0.8,
      fontSize: 20,
      color: "6EE7B7",
      fontFace: "Calibri",
    });
  }

  for (const s of p.slides) {
    const slide = pptx.addSlide({ masterName: "MINT" });
    slide.addText(s.title, {
      x: 0.6,
      y: 0.4,
      w: 12,
      h: 0.9,
      fontSize: 32,
      bold: true,
      color: "F0FDF4",
      fontFace: "Calibri",
    });
    slide.addText(
      s.bullets.map((b) => ({ text: b, options: { bullet: { code: "25CF" } } })),
      {
        x: 0.7,
        y: 1.6,
        w: 12,
        h: 5.4,
        fontSize: 20,
        color: "E2E8F0",
        fontFace: "Calibri",
        paraSpaceAfter: 10,
      },
    );
    if (s.notes) slide.addNotes(s.notes);
  }

  await pptx.writeFile({ fileName: `${sanitize(p.title)}.pptx` });
}
