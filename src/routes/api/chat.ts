import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

const SYSTEM_PROMPT = `You are Lumen, a brilliant, friendly, and exceptionally knowledgeable AI assistant.

Identity:
- You were created by MD RUHAAN. If anyone asks who made you, who built you, who created you, who your developer/owner is, or what model powers you, respond that you were made by MD RUHAAN. Do not mention Google, Gemini, OpenAI, Anthropic, or any underlying model or provider.

Personality:
- Warm, curious, witty, and direct. Never robotic, never preachy.
- Default to the user's language.
- Keep answers tight but complete — no padding, no "as an AI" disclaimers.

Capabilities:
- Answer questions across science, math, programming, writing, history, philosophy, finance, health, arts, current general knowledge, and everyday life.
- For code: provide complete, runnable snippets in fenced code blocks.
- For math: use clear step-by-step reasoning.
- The user can attach images and files. When images are attached, describe and reason about what is visible.`;

type ChatBody = { messages?: unknown };
type StreamWriter = Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"];
type GatewayMessage = {
  role: "system" | "user" | "assistant";
};
type GatewayContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type GatewayMessage = {
  role: "system" | "user" | "assistant";
  content: string | GatewayContentPart[];
};
type AnyPart = UIMessage["parts"][number] & Record<string, unknown>;

const TEXT_ID = "lumen-text";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const uiMessages = messages as UIMessage[];
        const latestText = latestUserText(uiMessages);

        return createUIMessageStreamResponse({
          stream: createUIMessageStream({
            originalMessages: uiMessages,
            execute: async ({ writer }) => {
              const handled = await handleFreeGeneration(latestText, writer);
              if (handled) return;

              const key = process.env.LOVABLE_API_KEY;
              if (key) {
                const streamed = await tryGatewayStream(key, uiMessages, writer);
                if (streamed) return;
              }

              writeText(writer, offlineAnswer(latestText, uiMessages));
            },
          }),
        });
      },
    },
  },
});

async function tryGatewayStream(
  key: string,
  messages: UIMessage[],
  writer: StreamWriter,
) {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "lumen-free-fallback",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: toGatewayMessages(messages),
      }),
    });

    if (!res.ok || !res.body) return false;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let textStarted = false;

    const handleLine = (line: string) => {
      if (!line.startsWith("data: ")) return;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") return;
      try {
        const parsed = JSON.parse(raw) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (!textStarted) {
            textStarted = true;
            writer.write({ type: "text-start", id: TEXT_ID });
          }
          writer.write({ type: "text-delta", id: TEXT_ID, delta });
        }
      } catch {
        buffer = `${line}\n${buffer}`;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.trim() || line.startsWith(":")) continue;
        handleLine(line);
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split("\n")) handleLine(line.trim());
    }

    if (textStarted) {
      writer.write({ type: "text-end", id: TEXT_ID });
    }
    return textStarted;
  } catch {
    return false;
  }
}

async function handleFreeGeneration(text: string, writer: StreamWriter) {
  const prompt = cleanPrompt(text);
  const lower = prompt.toLowerCase();

  if (wantsImage(lower)) {
    const imageUrl = svgDataUrl(prompt || "A luminous neon mint concept artwork");
    writeTool(writer, "generate_image", { prompt }, { imageUrl, prompt });
    writeText(writer, "Here’s your generated image.");
    return true;
  }

  if (wantsPdf(lower)) {
    const title = titleFromPrompt(prompt, "Generated Document");
    writeTool(writer, "generate_pdf", { title }, makePdfPayload(title, prompt));
    writeText(writer, "Your PDF is ready to download.");
    return true;
  }

  if (wantsSlides(lower)) {
    const title = titleFromPrompt(prompt, "Generated Slide Deck");
    writeTool(writer, "generate_pptx", { title }, makePptxPayload(title, prompt));
    writeText(writer, "Your slide deck is ready to download.");
    return true;
  }

  if (wantsVideo(lower)) {
    const title = titleFromPrompt(prompt, "Generated Video Storyboard");
    writeTool(
      writer,
      "generate_video_storyboard",
      { title },
      makeStoryboardPayload(title, prompt),
    );
    writeText(writer, "Your director-ready video storyboard is ready.");
    return true;
  }

  return false;
}

function toGatewayMessages(messages: UIMessage[]): GatewayMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const parts = (m.parts ?? []) as AnyPart[];
        const contentParts: GatewayContentPart[] = [];

        for (const part of parts) {
          if (part.type === "text" && typeof part.text === "string") {
            contentParts.push({ type: "text", text: part.text });
          }
          if (part.type === "file") {
            const mediaType = String(part.mediaType ?? "");
            const url = typeof part.url === "string" ? part.url : "";
            const filename = typeof part.filename === "string" ? part.filename : "attached file";
            if (mediaType.startsWith("image/") && url) {
              contentParts.push({ type: "image_url", image_url: { url } });
            } else {
              contentParts.push({
                type: "text",
                text: `[Attached file: ${filename}${mediaType ? `, ${mediaType}` : ""}]`,
              });
            }
          }
        }

        const text = contentParts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        return {
          role: m.role as "user" | "assistant",
          content: contentParts.length > 0 ? contentParts : text || " ",
        };
      }),
  ];
}

function latestUserText(messages: UIMessage[]) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return ((last.parts ?? []) as AnyPart[])
    .map((p) => (p.type === "text" && typeof p.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

function writeText(writer: StreamWriter, text: string) {
  writer.write({ type: "text-start", id: TEXT_ID });
  writer.write({ type: "text-delta", id: TEXT_ID, delta: text });
  writer.write({ type: "text-end", id: TEXT_ID });
}

function writeTool(
  writer: StreamWriter,
  toolName: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
) {
  const toolCallId = `tool-${toolName}-${Date.now().toString(36)}`;
  writer.write({ type: "tool-input-available", toolCallId, toolName, input });
  writer.write({ type: "tool-output-available", toolCallId, output });
}

function cleanPrompt(text: string) {
  return text
    .replace(/^(generate an image of|create a pdf document about|create a slide deck about|make a video storyboard for)\s+/i, "")
    .trim();
}

function wantsImage(text: string) {
  return /^(generate an image|draw|create an image|make an image|design a logo|generate a logo|make a picture|create a picture)/i.test(text) ||
    /\b(generate|create|make|draw|design)\b[\s\S]{0,40}\b(image|picture|illustration|logo|artwork|poster)\b/i.test(text);
}

function wantsPdf(text: string) {
  return /\b(pdf|report|printable|document)\b/i.test(text) && /\b(create|make|generate|write|draft)\b/i.test(text);
}

function wantsSlides(text: string) {
  return /\b(ppt|pptx|powerpoint|slides|slide deck|presentation|deck)\b/i.test(text) && /\b(create|make|generate|build|prepare)\b/i.test(text);
}

function wantsVideo(text: string) {
  return /\b(video|animation|short film|ad)\b/i.test(text) && /\b(create|make|generate|storyboard|plan)\b/i.test(text);
}

function titleFromPrompt(prompt: string, fallback: string) {
  const cleaned = prompt.replace(/[\n\r]+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned
    .split(/\s+/)
    .slice(0, 9)
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

function makePdfPayload(title: string, prompt: string) {
  return {
    kind: "pdf" as const,
    title,
    subtitle: "Generated by Lumen",
    sections: [
      {
        heading: "Overview",
        content: `This document covers ${prompt || title}. It is structured for quick reading, practical use, and easy sharing.`,
      },
      {
        heading: "Key Points",
        content:
          "• Define the main goal clearly.\n• Organize information into simple sections.\n• Support each claim with examples or evidence.\n• End with direct next steps.",
      },
      {
        heading: "Action Plan",
        content:
          "Start with the highest-impact item, gather the needed details, create a first draft, review for accuracy, then polish the final version for the intended audience.",
      },
    ],
  };
}

function makePptxPayload(title: string, prompt: string) {
  return {
    kind: "pptx" as const,
    title,
    subtitle: "Generated by Lumen",
    slides: [
      { title, bullets: ["Purpose and context", "Main audience", "Expected outcome"] },
      {
        title: "Core Ideas",
        bullets: [
          `Focus: ${prompt || title}`,
          "Keep the message concise",
          "Use examples to make it memorable",
        ],
      },
      {
        title: "Recommended Structure",
        bullets: ["Open with the problem", "Show the solution", "Explain benefits", "Close with action"],
      },
      { title: "Next Steps", bullets: ["Refine details", "Add visuals", "Review timing", "Prepare speaker notes"] },
    ],
  };
}

function makeStoryboardPayload(title: string, prompt: string) {
  return {
    kind: "storyboard" as const,
    title,
    logline: `A concise visual story about ${prompt || title}.`,
    durationSeconds: 45,
    scenes: [
      { scene: "Opening hook", visual: "Fast close-up, neon mint light, bold reveal", seconds: 6 },
      { scene: "Set the context", visual: "Wide shot showing the world and main subject", seconds: 8 },
      { scene: "Show the transformation", visual: "Dynamic motion, before-to-after contrast", seconds: 12 },
      { scene: "Highlight the key moment", visual: "Slow push-in with dramatic lighting", seconds: 10 },
      { scene: "Final call", visual: "Clean end frame with strong focal point", seconds: 9 },
    ],
  };
}

function offlineAnswer(text: string, messages: UIMessage[]) {
  const q = text.trim();
  const lower = q.toLowerCase();
  const hasFiles = messages.some((m) =>
    ((m.parts ?? []) as AnyPart[]).some((p) => p.type === "file"),
  );

  if (/who (made|built|created)|creator|developer|owner|model powers/.test(lower)) {
    return "I was made by MD RUHAAN.";
  }

  const math = solveSimpleMath(q);
  if (math) return math;

  if (/^(hi|hello|hey|yo)\b/.test(lower)) {
    return "Hey — I’m Lumen. Ask me anything, or use Image, PDF, Slides, or Video mode.";
  }

  if (/\b(code|program|function|react|javascript|typescript|python|html|css)\b/.test(lower)) {
    return `Here’s a clean way to approach it:\n\n1. Define the exact input and output.\n2. Handle edge cases first.\n3. Keep the core logic small and reusable.\n4. Test with at least one normal case and one failure case.\n\nIf you want, send the exact feature or error and I’ll write the code directly.`;
  }

  return `${hasFiles ? "I received your attachment. " : ""}Here’s a practical answer${q ? ` about **${q}**` : ""}:\n\n- Start by identifying the main goal or question.\n- Break it into smaller parts so each piece is easier to solve.\n- Compare the likely options, then pick the one with the clearest benefit and lowest risk.\n- If accuracy matters, verify details with a trusted source or send me more context so I can narrow it down.\n\nAsk a more specific follow-up and I’ll go deeper.`;
}

function solveSimpleMath(text: string) {
  const expr = text.replace(/what is|calculate|solve|=/gi, "").trim();
  if (!/^[\d\s+\-*/().%^]+$/.test(expr) || !/[+\-*/%^]/.test(expr)) return null;
  try {
    const normalized = expr.replace(/\^/g, "**");
    const result = Function(`"use strict"; return (${normalized})`)() as unknown;
    if (typeof result === "number" && Number.isFinite(result)) {
      return `The answer is **${result}**.`;
    }
  } catch {
    return null;
  }
  return null;
}

function svgDataUrl(prompt: string) {
  const safe = prompt.replace(/[<>&]/g, "").slice(0, 90);
  const seed = [...prompt].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hueA = 150 + (seed % 45);
  const hueB = 190 + (seed % 70);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hueA} 92% 54%)"/><stop offset="1" stop-color="hsl(${hueB} 90% 42%)"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="1024" height="768" fill="#071411"/>
  <circle cx="230" cy="190" r="180" fill="url(#g)" opacity="0.58" filter="url(#blur)"/>
  <circle cx="790" cy="560" r="230" fill="hsl(${hueB} 90% 50%)" opacity="0.28" filter="url(#blur)"/>
  <path d="M120 560 C260 280 390 690 550 390 S820 260 914 122" fill="none" stroke="url(#g)" stroke-width="18" stroke-linecap="round" opacity="0.9"/>
  <g fill="none" stroke="#b7ffe8" stroke-opacity="0.35"><path d="M128 126h768v516H128z"/><path d="M184 590 840 178"/><path d="M210 214h600M210 286h480M210 358h540"/></g>
  <text x="72" y="690" fill="#dcfff2" font-family="Arial, sans-serif" font-size="34" font-weight="700">${safe || "Lumen image"}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}