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
- For math: ALWAYS write equations using LaTeX with DOLLAR SIGN delimiters only. Inline math uses single dollar signs like $E = mc^2$ and display math uses double dollar signs like $$\\int_0^1 x^2\\,dx = \\tfrac{1}{3}$$. Do NOT use \\(...\\) or \\[...\\] — only $...$ and $$...$$. NEVER substitute placeholder symbols (no asterisks, no "&$*+*"). Always compute and show the final numeric answer.
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
                await handleChat(uiMessages, writer, request);
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
  // Try Lovable AI Gateway first (fast, reliable), fall back to Pollinations.
  const lovableKey = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LOVABLE_API_KEY;
  if (lovableKey) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          temperature: opts.temperature ?? 0.7,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content ?? "";
        if (content) return content;
      }
    } catch { /* fall through */ }
  }
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

async function handleChat(messages: UIMessage[], writer: StreamWriter, request: Request) {
  const provider = toProviderMessages(messages);

  const latestRaw = latestUserText(messages);
  const latest = latestRaw.toLowerCase();

  // Code-only mode: client prefixes with [[CODE_ONLY]] when the Code tab is active.
  if (latestRaw.includes("[[CODE_ONLY]]")) {
    provider.splice(1, 0, {
      role: "system",
      content:
        "CODE-ONLY MODE: You are now a strict programming assistant. Answer ONLY questions about programming, software engineering, algorithms, debugging, code review, tooling, or computer science. If the request is unrelated to coding, politely refuse in one sentence and invite a coding question. Prefer complete, runnable code in fenced code blocks with the correct language tag. Keep prose minimal and put explanations as short comments inside the code where possible.",
    });
  }

  // If user asks about weather/location, enrich with live data.
  if (/\b(weather|forecast|temperature|raining|rain|sunny|humidity|wind|climate|hot|cold|snow|where am i|my location|my city)\b/.test(latest)) {
    const ctx = await fetchLocationWeather(request).catch(() => null);
    if (ctx) provider.splice(1, 0, { role: "system", content: ctx });
  }

  // Prefer Lovable AI Gateway for fast, reliable streaming.
  const lovableKey = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LOVABLE_API_KEY;
  if (lovableKey) {
    const lovableModels = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    for (const model of lovableModels) {
      const streamed = await streamFromLovable(provider, writer, model, lovableKey).catch(() => "error" as const);
      if (streamed === true) return;
      if (streamed === "rate-limited") continue;
      if (streamed === false) break;
    }
  }

  // Fallback: stream from Pollinations, with model fallbacks on 429.
  const models = ["openai-fast", "openai", "mistral", "qwen-coder"];
  for (const model of models) {
    const streamed = await streamFromPollinations(provider, writer, model).catch(() => "error" as const);
    if (streamed === true) return;
    if (streamed === "rate-limited") continue;
    if (streamed === false) break;
  }

  // Final fallback: non-streaming call + instant write.
  try {
    const full = await callProvider(provider);
    writeText(writer, full);
  } catch {
    writeText(writer, "I'm getting a lot of requests right now. Please try again in a few seconds.");
  }
}

async function streamFromLovable(
  messages: ProviderMessage[],
  writer: StreamWriter,
  model: string,
  apiKey: string,
): Promise<boolean | "rate-limited"> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
  });
  if (res.status === 429 || res.status === 402) return "rate-limited";
  if (!res.ok || !res.body) return false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let started = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (!started) { writer.write({ type: "text-start", id: TEXT_ID }); started = true; }
          writer.write({ type: "text-delta", id: TEXT_ID, delta });
        }
      } catch { /* ignore */ }
    }
  }
  if (started) writer.write({ type: "text-end", id: TEXT_ID });
  return started;
}

async function streamFromPollinations(
  messages: ProviderMessage[],
  writer: StreamWriter,
  model: string,
): Promise<boolean | "rate-limited"> {
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      private: true,
      temperature: 0.7,
    }),
  });
  if (res.status === 429 || res.status === 402) return "rate-limited";
  if (!res.ok || !res.body) return false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let started = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (!started) { writer.write({ type: "text-start", id: TEXT_ID }); started = true; }
          writer.write({ type: "text-delta", id: TEXT_ID, delta });
        }
      } catch { /* ignore */ }
    }
  }
  if (started) writer.write({ type: "text-end", id: TEXT_ID });
  return started;
}

async function fetchLocationWeather(request: Request): Promise<string | null> {
  // Cloudflare provides location headers; fall back to IP geolocation.
  const h = request.headers;
  let lat = parseFloat(h.get("cf-iplatitude") || "");
  let lon = parseFloat(h.get("cf-iplongitude") || "");
  let city = h.get("cf-ipcity") || "";
  let country = h.get("cf-ipcountry") || "";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const ip = (h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "").split(",")[0].trim();
    try {
      const geo = await fetch(`https://ipapi.co/${ip || ""}/json/`).then((r) => r.json()) as {
        latitude?: number; longitude?: number; city?: string; country_name?: string;
      };
      if (geo.latitude && geo.longitude) {
        lat = geo.latitude; lon = geo.longitude;
        city = city || geo.city || ""; country = country || geo.country_name || "";
      }
    } catch { /* ignore */ }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  try {
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`,
    ).then((r) => r.json()) as {
      current?: Record<string, number>;
      daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weather_code: number[] };
    };
    const c = w.current ?? {};
    const d = w.daily;
    const lines: string[] = [];
    lines.push(`LIVE_LOCATION: ${city || "unknown city"}${country ? ", " + country : ""} (lat ${lat.toFixed(2)}, lon ${lon.toFixed(2)})`);
    if (c.temperature_2m !== undefined) {
      lines.push(`LIVE_WEATHER_NOW: ${c.temperature_2m}°C (feels ${c.apparent_temperature ?? "?"}°C), humidity ${c.relative_humidity_2m ?? "?"}%, wind ${c.wind_speed_10m ?? "?"} km/h, code ${c.weather_code ?? "?"}, ${c.is_day ? "day" : "night"}.`);
    }
    if (d?.time?.length) {
      const fc = d.time.slice(0, 3).map((day, i) =>
        `${day}: ${d.temperature_2m_min[i]}°–${d.temperature_2m_max[i]}°C, rain ${d.precipitation_probability_max[i]}%, code ${d.weather_code[i]}`,
      ).join("; ");
      lines.push(`LIVE_FORECAST_3D: ${fc}`);
    }
    lines.push("Use this live data naturally in your answer; convert codes to plain descriptions (e.g. 0=clear, 1-3=partly cloudy, 45/48=fog, 51-67=rain, 71-77=snow, 80-82=showers, 95-99=thunderstorm). Mention the city.");
    return lines.join("\n");
  } catch {
    return `LIVE_LOCATION: ${city || "unknown"}${country ? ", " + country : ""} (lat ${lat}, lon ${lon}). Weather lookup failed.`;
  }
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
          "You are a director writing tight video storyboards. Reply ONLY with valid JSON matching this exact schema: {\"title\": string, \"logline\": string, \"durationSeconds\": number, \"scenes\": [{\"scene\": string, \"visual\": string, \"voiceover\": string, \"seconds\": number, \"imagePrompt\": string}]}. Include EXACTLY 3 scenes with a clear arc. Each scene's imagePrompt must be a vivid, single-sentence, cinematic still-frame description (camera, subject, lighting, mood, palette) suitable for an AI image generator. Each scene 3-4 seconds. JSON only.",
      },
      { role: "user", content: `Storyboard a video about: ${topic}` },
    ],
    { json: true, temperature: 0.85 },
  );
  const parsed = safeJson<{
    title: string;
    logline: string;
    durationSeconds?: number;
    scenes: Array<{ scene: string; visual: string; voiceover?: string; seconds?: number; imagePrompt?: string }>;
  }>(raw);

  const baseScenes = parsed?.scenes?.length
    ? parsed.scenes
    : [{ scene: "Opening", visual: "Hero reveal", seconds: 6, imagePrompt: topic }];

  // Generate a real Pollinations image URL for each scene so the player has actual frames.
  const scenes = baseScenes.map((s, i) => {
    const promptText = s.imagePrompt || s.visual || s.scene || topic;
    const seed = Math.floor(Math.random() * 1_000_000) + i;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      `${promptText}, cinematic still, dramatic lighting, ultra detailed, film grain`,
    )}?width=768&height=432&nologo=true&seed=${seed}`;
    return { ...s, imageUrl, seconds: Math.min(s.seconds ?? 4, 4) };
  });

  const payload = {
    kind: "storyboard" as const,
    title: parsed?.title || titleFromPrompt(topic, "Generated Storyboard"),
    logline: parsed?.logline || `A short visual story about ${topic}.`,
    durationSeconds:
      parsed?.durationSeconds ??
      scenes.reduce((acc, s) => acc + (s.seconds || 5), 0),
    scenes,
  };
  writeTool(writer, "generate_video_storyboard", { title: payload.title }, payload);
  await streamText(
    writer,
    `Your video “${payload.title}” is ready — press play to watch, or download it as a clip.`,
  );
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
            contentParts.push({
              type: "text",
              text: part.text.replace(/\[\[CODE_ONLY\]\]\s*/g, ""),
            });
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
  writer.write({ type: "text-delta", id: TEXT_ID, delta: text });
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