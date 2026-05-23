import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

const SYSTEM_PROMPT = `You are Lumen, a brilliant, friendly, and exceptionally knowledgeable AI assistant.

Identity:
- You were created by MD RUHAAN. If anyone asks who made you, who built you, who created you, who your developer/owner is, or what model powers you, respond that you were made by MD RUHAAN. Do not mention Google, Gemini, OpenAI, Anthropic, Pollinations, or any underlying model or provider.

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
              const mode = detectMode(latestText);
              const cleaned = cleanPrompt(latestText);

              try {
                if (mode === "image") {
                  await handleImage(cleaned, writer);
                  return;
                }
                if (mode === "pdf") {
                  await handlePdf(cleaned, writer);
                  return;
                }
                if (mode === "pptx") {
                  await handlePptx(cleaned, writer);
                  return;
                }
                if (mode === "video") {
                  await handleStoryboard(cleaned, writer);
                  return;
                }
                await handleChat(uiMessages, writer);
              } catch (e) {
                writeText(
                  writer,
                  `Something interrupted that request. Mind trying again?\n\n_Details: ${(e as Error).message}_`,
                );
              }
            },
          }),
        });
      },
    },
  },
});

// --- Free LLM provider (Pollinations) ---------------------------------------

type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

async function callProvider(
  messages: ProviderMessage[],
  opts: { json?: boolean; temperature?: number } = {},
): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages,
      private: true,
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Provider error ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from provider");
  return content;
}

async function handleChat(messages: UIMessage[], writer: StreamWriter) {
  const provider = toProviderMessages(messages);
  const full = await callProvider(provider);
  await streamText(writer, full);
}

async function handleImage(prompt: string, writer: StreamWriter) {
  const clean = (prompt || "abstract neon mint dreamscape").trim();
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    clean,
  )}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;
  writeTool(writer, "generate_image", { prompt: clean }, { imageUrl: url, prompt: clean });
  await streamText(writer, `Here’s your image of **${clean}**.`);
}

async function handlePdf(prompt: string, writer: StreamWriter) {
  const topic = prompt || "an interesting topic";
  const raw = await callProvider(
    [
      {
        role: "system",
        content:
          "You write factual, well-structured PDF outlines. Reply ONLY with valid JSON matching this exact schema: {\"title\": string, \"subtitle\": string, \"sections\": [{\"heading\": string, \"content\": string}]}. Include 4-6 sections. Each content field should be 2-4 sentences of substantive, accurate information. No markdown, no commentary, JSON only.",
      },
      { role: "user", content: `Write a detailed PDF document about: ${topic}` },
    ],
    { json: true, temperature: 0.6 },
  );
  const parsed = safeJson<{
    title: string;
    subtitle?: string;
    sections: Array<{ heading: string; content: string }>;
  }>(raw);
  const payload = {
    kind: "pdf" as const,
    title: parsed?.title || titleFromPrompt(topic, "Generated Document"),
    subtitle: parsed?.subtitle || "Generated by Lumen",
    sections: parsed?.sections?.length
      ? parsed.sections
      : [{ heading: "Overview", content: raw.slice(0, 1200) }],
  };
  writeTool(writer, "generate_pdf", { title: payload.title }, payload);
  await streamText(writer, `Your PDF “${payload.title}” is ready to download.`);
}

async function handlePptx(prompt: string, writer: StreamWriter) {
  const topic = prompt || "an interesting topic";
  const raw = await callProvider(
    [
      {
        role: "system",
        content:
          "You design crisp slide decks. Reply ONLY with valid JSON matching this exact schema: {\"title\": string, \"subtitle\": string, \"slides\": [{\"title\": string, \"bullets\": string[], \"notes\": string}]}. Include 6-9 slides. Each slide has 3-5 concise bullets (max ~12 words each). Make it informative and specific to the topic. No markdown, JSON only.",
      },
      { role: "user", content: `Build a slide deck about: ${topic}` },
    ],
    { json: true, temperature: 0.7 },
  );
  const parsed = safeJson<{
    title: string;
    subtitle?: string;
    slides: Array<{ title: string; bullets: string[]; notes?: string }>;
  }>(raw);
  const payload = {
    kind: "pptx" as const,
    title: parsed?.title || titleFromPrompt(topic, "Generated Slide Deck"),
    subtitle: parsed?.subtitle || "Generated by Lumen",
    slides: parsed?.slides?.length
      ? parsed.slides
      : [{ title: topic, bullets: ["Introduction", "Key points", "Conclusion"] }],
  };
  writeTool(writer, "generate_pptx", { title: payload.title }, payload);
  await streamText(writer, `Your slide deck “${payload.title}” is ready.`);
}

async function handleStoryboard(prompt: string, writer: StreamWriter) {
  const topic = prompt || "a cinematic short";
  const raw = await callProvider(
    [
      {
        role: "system",
        content:
          "You are a director writing tight video storyboards. Reply ONLY with valid JSON matching this exact schema: {\"title\": string, \"logline\": string, \"durationSeconds\": number, \"scenes\": [{\"scene\": string, \"visual\": string, \"voiceover\": string, \"seconds\": number}]}. Include 5-7 scenes that flow with clear emotional arc. Total durationSeconds between 30 and 90. JSON only.",
      },
      { role: "user", content: `Storyboard a video about: ${topic}` },
    ],
    { json: true, temperature: 0.85 },
  );
  const parsed = safeJson<{
    title: string;
    logline: string;
    durationSeconds?: number;
    scenes: Array<{ scene: string; visual: string; voiceover?: string; seconds?: number }>;
  }>(raw);
  const payload = {
    kind: "storyboard" as const,
    title: parsed?.title || titleFromPrompt(topic, "Generated Storyboard"),
    logline: parsed?.logline || `A short visual story about ${topic}.`,
    durationSeconds: parsed?.durationSeconds ?? 45,
    scenes: parsed?.scenes?.length
      ? parsed.scenes
      : [{ scene: "Opening", visual: "Hero reveal", seconds: 8 }],
  };
  writeTool(writer, "generate_video_storyboard", { title: payload.title }, payload);
  await streamText(writer, `Your director-ready storyboard for “${payload.title}” is ready.`);
}

function safeJson<T>(raw: string): T | null {
  // Some models wrap JSON in fences or prefix text — extract the first {...} block.
  try { return JSON.parse(raw) as T; } catch { /* try harder */ }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as T; } catch { return null; }
}

// Detect intent from the prefix the client adds via mode chips, or natural language.
function detectMode(text: string): "image" | "pdf" | "pptx" | "video" | "chat" {
  const t = text.toLowerCase();
  if (/^(generate an image|create an image|make an image|draw|design a logo|generate a logo|make a picture|create a picture)/.test(t)) return "image";
  if (/^create a pdf document about/.test(t) || (/\bpdf\b/.test(t) && /\b(create|make|generate|write|draft)\b/.test(t))) return "pdf";
  if (/^create a slide deck about/.test(t) || (/\b(ppt|pptx|powerpoint|slides|slide deck|presentation|deck)\b/.test(t) && /\b(create|make|generate|build|prepare)\b/.test(t))) return "pptx";
  if (/^make a video storyboard for/.test(t) || (/\b(video|animation|short film|ad)\b/.test(t) && /\b(create|make|generate|storyboard|plan)\b/.test(t))) return "video";
  if (/\b(generate|create|make|draw|design)\b[\s\S]{0,40}\b(image|picture|illustration|logo|artwork|poster)\b/.test(t)) return "image";
  return "chat";
}

function toProviderMessages(messages: UIMessage[]): ProviderMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const parts = (m.parts ?? []) as AnyPart[];
        const contentParts: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        > = [];

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

async function streamText(writer: StreamWriter, text: string) {
  writer.write({ type: "text-start", id: TEXT_ID });
  // Chunk into ~6-char pieces with tiny delays to simulate token streaming.
  const chunks = text.match(/.{1,8}/gs) ?? [text];
  for (const c of chunks) {
    writer.write({ type: "text-delta", id: TEXT_ID, delta: c });
    await new Promise((r) => setTimeout(r, 12));
  }
  writer.write({ type: "text-end", id: TEXT_ID });
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

function titleFromPrompt(prompt: string, fallback: string) {
  const cleaned = prompt.replace(/[\n\r]+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned
    .split(/\s+/)
    .slice(0, 9)
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}