// Client-side PDF & PPTX builders driven by AI tool output.
import { jsPDF } from "jspdf";
import PptxGenJS from "pptxgenjs";

export type PdfPayload = {
  kind: "pdf";
  title: string;
  subtitle?: string;
  sections: Array<{ heading: string; content: string }>;
};

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

  for (const sec of p.sections) {
    if (y > H - M - 60) {
      doc.addPage();
      y = M;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20, 30, 40);
    const hLines = doc.splitTextToSize(sec.heading, W - M * 2);
    doc.text(hLines, M, y);
    y += hLines.length * 18 + 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 75);
    const paras = sec.content.split(/\n{2,}/);
    for (const para of paras) {
      const lines = doc.splitTextToSize(para.replace(/\s+\n/g, "\n"), W - M * 2);
      for (const line of lines) {
        if (y > H - M) {
          doc.addPage();
          y = M;
        }
        doc.text(line, M, y);
        y += 15;
      }
      y += 6;
    }
    y += 10;
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
