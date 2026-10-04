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

type ChatBody = { messages?: unknown; language?: unknown; languageLabel?: unknown; timeZone?: unknown };
type StreamWriter = Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"];
type AnyPart = UIMessage["parts"][number] & Record<string, unknown>;

const TEXT_ID = "lumen-text";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as ChatBody;
        const { messages } = body;
        const language = typeof body.language === "string" ? body.language : "en";
        const languageLabel =
          typeof body.languageLabel === "string" ? body.languageLabel : "English";
        const timeZone = validTimeZone(body.timeZone);
        const clock = dateContext(timeZone);
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
                if (mode === "chat" && language === "en" && isDateQuestion(cleaned)) {
                  writeText(
                    writer,
                    `Today is **${clock.full}**, and it's **${clock.time}** where you are.`,
                  );
                  return;
                }
                if (mode === "image") {
                  await handleImage(cleaned, writer);
                  return;
                }
                if (mode === "pdf") {
                  await handlePdf(cleaned, writer, clock.text);
                  return;
                }
                if (mode === "pptx") {
                  await handlePptx(cleaned, writer, clock.text);
                  return;
                }
                if (mode === "video") {
                  await handleStoryboard(cleaned, writer);
                  return;
                }
                await handleChat(uiMessages, writer, request, { language, languageLabel, clock: clock.text });
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

async function handleChat(
  messages: UIMessage[],
  writer: StreamWriter,
  request: Request,
  opts: { language: string; languageLabel: string; clock: string },
) {
  const provider = toProviderMessages(messages);

  const latestRaw = latestUserText(messages);
  const latest = latestRaw.toLowerCase();

  // Always ground the model in the real current date/time.
  provider.splice(1, 0, { role: "system", content: opts.clock });

  // Pull fresh headlines for time-sensitive questions so answers stay current.
  if (!latestRaw.includes("[[CODE_ONLY]]") && NEWS_RE.test(latest)) {
    const news = await fetchNews(latestRaw, request).catch(() => null);
    if (news) provider.splice(2, 0, { role: "system", content: news });
  }

  // Language directive — always inject unless user picked English default.
  if (opts.language && opts.language !== "en") {
    provider.splice(1, 0, {
      role: "system",
      content:
        `LANGUAGE DIRECTIVE: The user has chosen ${opts.languageLabel} (code: ${opts.language}) as their preferred language. ` +
        `Reply ENTIRELY in ${opts.languageLabel}, including headings, lists, and explanations. ` +
        `Only keep code, math (LaTeX), URLs, brand names, and technical identifiers in their original form. ` +
        `If ${opts.languageLabel} uses a non-Latin script, use that script natively — do NOT transliterate. ` +
        `If the user writes to you in a different language, still answer in ${opts.languageLabel} unless they explicitly ask otherwise.`,
    });
  }

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
  const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    clean,
  )}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;

  // Announce the pending tool call so the client shows the generating animation.
  const toolCallId = `tool-generate_image-${Date.now().toString(36)}`;
  writer.write({
    type: "tool-input-available",
    toolCallId,
    toolName: "generate_image",
    input: { prompt: clean },
  });

  const dataUrl = await generateImageDataUrl(clean);
  writer.write({
    type: "tool-output-available",
    toolCallId,
    output: { imageUrl: dataUrl ?? fallbackUrl, prompt: clean },
  });
  await streamText(writer, `Here’s your image of **${clean}**.`);
}

/** Generate a real image through the Lovable AI Gateway; null if unavailable. */
async function generateImageDataUrl(prompt: string): Promise<string | null> {
  const key = (globalThis as { process?: { env?: Record<string, string> } }).process?.env
    ?.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        quality: "low",
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = data.data?.[0];
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
    if (first?.url) return first.url;
    return null;
  } catch {
    return null;
  }
}

async function handlePdf(prompt: string, writer: StreamWriter, clock: string) {
  const topic = prompt || "an interesting topic";
  const docKind = detectDocKind(topic);
  const guide = docKindGuide(docKind);

  const raw = await callProvider(
    [
      {
        role: "system",
        content:
`You are a document composer for Lumen. Reply ONLY with valid JSON — no markdown, no commentary.

Schema:
{
  "title": string,
  "subtitle": string | null,
  "blocks": [
    { "type": "heading", "text": string, "level": 1 | 2 | 3 } |
    { "type": "paragraph", "text": string } |
    { "type": "list", "items": string[], "ordered": boolean } |
    { "type": "questions", "items": string[], "numbered": boolean, "answerLines": number } |
    { "type": "kv", "pairs": [{ "label": string, "value": string }] } |
    { "type": "quote", "text": string } |
    { "type": "divider" } |
    { "type": "spacer", "size": number }
  ]
}

Rules:
- Choose ONLY the block types that fit what the user asked for. Do not force paragraphs into every document.
- Never invent unrelated sections (no "Overview", "Introduction", "Conclusion" filler unless the user asked for an essay/report).
- For worksheets/quizzes/tests: use ONLY a short heading + one "questions" block. Do NOT include answers, explanations, or paragraphs.
- Match the user's requested count exactly (e.g. "10 questions" → 10 items). Default 10 when unspecified.
- Keep text plain — no markdown syntax inside strings.

Document kind: ${docKind}.
${guide}

${clock}`,
      },
      { role: "user", content: `Create this document: ${topic}` },
    ],
    { json: true, temperature: 0.5 },
  );

  const parsed = safeJson<{
    title?: string;
    subtitle?: string | null;
    blocks?: Array<Record<string, unknown>>;
    // legacy
    sections?: Array<{ heading: string; content: string }>;
  }>(raw);

  const payload = {
    kind: "pdf" as const,
    title: parsed?.title || titleFromPrompt(topic, "Generated Document"),
    subtitle: (parsed?.subtitle ?? undefined) || undefined,
    blocks: Array.isArray(parsed?.blocks) ? (parsed!.blocks as unknown[]) : undefined,
    sections: Array.isArray(parsed?.sections) ? parsed!.sections : undefined,
    docKind,
  };

  // If the model returned nothing usable, fall back to a single paragraph block.
  if (!payload.blocks?.length && !payload.sections?.length) {
    payload.blocks = [{ type: "paragraph", text: raw.slice(0, 1200) }];
  }

  writeTool(writer, "generate_pdf", { title: payload.title }, payload as unknown as Record<string, unknown>);
  await streamText(writer, `Your ${docKind} “${payload.title}” is ready to download.`);
}

function detectDocKind(prompt: string): string {
  const t = prompt.toLowerCase();
  if (/\b(worksheet|practice sheet|question paper|quiz|test paper|exam)\b/.test(t)) return "worksheet";
  if (/\b(resume|cv|curriculum vitae)\b/.test(t)) return "resume";
  if (/\b(cover letter|letter of|formal letter|application letter)\b/.test(t)) return "letter";
  if (/\b(invoice|bill|receipt)\b/.test(t)) return "invoice";
  if (/\b(meeting|agenda|minutes)\b/.test(t)) return "agenda";
  if (/\b(lesson plan|syllabus|curriculum)\b/.test(t)) return "lesson-plan";
  if (/\b(checklist|to-?do|task list)\b/.test(t)) return "checklist";
  if (/\b(recipe)\b/.test(t)) return "recipe";
  if (/\b(report|whitepaper|analysis|essay|article)\b/.test(t)) return "report";
  if (/\b(flashcards?|study notes|revision notes|notes)\b/.test(t)) return "notes";
  if (/\b(story|poem|script)\b/.test(t)) return "creative";
  return "document";
}

function docKindGuide(kind: string): string {
  switch (kind) {
    case "worksheet":
      return "Output: one short heading (subject + topic) then a single \"questions\" block with `numbered: true`, `answerLines: 3`. No paragraphs, no answers, no instructions section unless the user explicitly asked. Match the number of questions the user asked for; default to 10.";
    case "resume":
      return "Use headings (Contact, Summary, Experience, Education, Skills), \"kv\" blocks for contact/dates, \"list\" blocks for bullet responsibilities and skills. No filler paragraphs.";
    case "letter":
      return "Use \"kv\" for date and address, short paragraphs for the body, and a closing block. No headings unless it's a formal letter with subject.";
    case "invoice":
      return "Use \"kv\" blocks for issuer, recipient, invoice number, dates; a \"list\" of line items; and a final \"kv\" block for subtotal/tax/total.";
    case "agenda":
      return "Use a heading with the meeting title/date, a \"kv\" block for attendees/time/location, and an ordered \"list\" of agenda items.";
    case "lesson-plan":
      return "Use headings for Objectives, Materials, Activities, Assessment. Use lists for materials and activities.";
    case "checklist":
      return "Use ONE short heading plus a single unordered \"list\" of concise, actionable items. No paragraphs.";
    case "recipe":
      return "Use headings for Ingredients and Steps. Ingredients as an unordered list. Steps as an ordered list. Optional short intro paragraph.";
    case "notes":
      return "Use short headings and bullet lists. Keep paragraphs to one sentence each. No filler.";
    case "creative":
      return "Use one heading with the title, then paragraphs (or a \"quote\" block for verse). No section headings unless the piece truly has parts/chapters.";
    case "report":
    default:
      return "Use 3-6 headings with focused paragraphs and lists where appropriate. Only include sections the topic actually needs.";
  }
}

const SLIDE_LAYOUTS = ["split", "image-left", "hero", "stats", "quote", "two-column", "bullets"] as const;
type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

type RawSlide = {
  layout?: string;
  title?: string;
  bullets?: unknown;
  notes?: string;
  imagePrompt?: string;
  stats?: Array<{ value?: unknown; label?: unknown }>;
  quote?: string;
  attribution?: string;
  columns?: Array<{ heading?: unknown; bullets?: unknown }>;
};

function slideImageUrl(prompt: string, seed: number, w = 1280, h = 960) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `${prompt}, professional presentation visual, cinematic lighting, rich detail, no text, no words, no watermark`,
  )}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
}

const strList = (v: unknown, max = 6) =>
  Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max) : [];

async function handlePptx(prompt: string, writer: StreamWriter, clock: string) {
  const topic = prompt || "an interesting topic";
  const countMatch = topic.match(/\b(\d{1,2})\s*(slides?|pages?)\b/i);
  const count = Math.max(4, Math.min(16, countMatch ? Number(countMatch[1]) : 9));
  const raw = await callProvider(
    [
      {
        role: "system",
        content: `You are an award-winning presentation designer and subject-matter expert. Reply ONLY with valid JSON — no markdown.

Schema:
{
  "title": string,
  "subtitle": string,
  "coverImagePrompt": string,
  "slides": [
    {
      "layout": "split" | "image-left" | "hero" | "stats" | "quote" | "two-column" | "bullets",
      "title": string,
      "bullets": string[],
      "notes": string,
      "imagePrompt": string,
      "stats": [{ "value": string, "label": string }],
      "quote": string,
      "attribution": string,
      "columns": [{ "heading": string, "bullets": string[] }]
    }
  ]
}

Rules:
- Exactly ${count} content slides (not counting the cover). Tell a clear story: hook → context → key ideas → evidence → implications → takeaway.
- Vary layouts. Use mostly "split" and "image-left"; include at least one "hero", one "stats" (2-4 real, well-known figures — never invent numbers; if unsure use qualitative labels), one "two-column" (comparisons, pros/cons, before/after), and at most one "quote" (only real, correctly attributed quotes).
- bullets: 3-5 per slide, specific and insightful, max ~14 words each. "hero" slides use 1 short punchy line.
- notes: 2-4 sentences of speaker notes that add depth beyond the bullets.
- imagePrompt: for EVERY slide and the cover, one vivid sentence describing a photo/illustration (subject, setting, lighting, mood). No text in images.
- Fill only the fields relevant to the layout; use [] or "" for the rest.
- Be factually accurate and up to date as of today.

${clock}`,
      },
      { role: "user", content: `Build a slide deck about: ${topic}` },
    ],
    { json: true, temperature: 0.7 },
  );
  const parsed = safeJson<{
    title?: string;
    subtitle?: string;
    coverImagePrompt?: string;
    slides?: RawSlide[];
  }>(raw);

  const base = Math.floor(Math.random() * 900_000);
  const title = parsed?.title || titleFromPrompt(topic, "Generated Slide Deck");
  const rawSlides: RawSlide[] = parsed?.slides?.length
    ? parsed.slides
    : [{ title: topic, bullets: ["Introduction", "Key points", "Conclusion"], layout: "split" }];

  const slides = rawSlides.slice(0, 16).map((s, i) => {
    const layout: SlideLayout = SLIDE_LAYOUTS.includes(s.layout as SlideLayout)
      ? (s.layout as SlideLayout)
      : "split";
    const imagePrompt = (s.imagePrompt || `${s.title || topic}, ${topic}`).trim();
    const wantsImage = layout === "split" || layout === "image-left" || layout === "hero";
    return {
      layout,
      title: String(s.title || `Slide ${i + 1}`),
      bullets: strList(s.bullets),
      notes: s.notes ? String(s.notes) : undefined,
      imagePrompt,
      imageUrl: wantsImage
        ? slideImageUrl(imagePrompt, base + i, layout === "hero" ? 1600 : 1024, layout === "hero" ? 900 : 1024)
        : undefined,
      stats: (s.stats ?? [])
        .map((x) => ({ value: String(x?.value ?? "").trim(), label: String(x?.label ?? "").trim() }))
        .filter((x) => x.value)
        .slice(0, 4),
      quote: s.quote ? String(s.quote) : undefined,
      attribution: s.attribution ? String(s.attribution) : undefined,
      columns: (s.columns ?? [])
        .map((c) => ({ heading: String(c?.heading ?? "").trim(), bullets: strList(c?.bullets, 5) }))
        .filter((c) => c.heading || c.bullets.length)
        .slice(0, 2),
    };
  });

  const coverPrompt = parsed?.coverImagePrompt || `${title}, striking editorial key visual`;
  const payload = {
    kind: "pptx" as const,
    title,
    subtitle: parsed?.subtitle || "Generated by Lumen",
    coverImageUrl: slideImageUrl(coverPrompt, base + 99, 1600, 900),
    slides,
  };
  writeTool(writer, "generate_pptx", { title: payload.title }, payload);
  await streamText(
    writer,
    `Your ${slides.length + 3}-slide deck “${payload.title}” is ready — with a cover, agenda, image layouts, speaker notes and a closing slide.`,
  );
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

// --- Current date / live freshness -----------------------------------------

function validTimeZone(v: unknown): string {
  if (typeof v !== "string" || !v || v.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: v });
    return v;
  } catch {
    return "UTC";
  }
}

function dateContext(timeZone: string) {
  const now = new Date();
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...o }).format(now);
  const full = fmt({ weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const time = fmt({ hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const year = fmt({ year: "numeric" });
  const text =
    `CURRENT DATE & TIME (authoritative, from the live clock — trust this over your training data): ` +
    `Today is ${full}. The user's local time is ${time} (${timeZone}). UTC now: ${now.toISOString()}. The current year is ${year}. ` +
    `Use this for any question about today's date, day, time, year, ages, deadlines, countdowns or "how long ago". Never say it is an earlier year. ` +
    `Your built-in knowledge may be older than today: for recent or fast-changing topics, rely on LIVE_NEWS context when it is provided, and say plainly when something may have changed since your information was last updated.`;
  return { full, time, year, text };
}

function isDateQuestion(text: string) {
  const t = text.toLowerCase().replace(/[?!.]+$/g, "").trim();
  return /^(hey |hi |lumen,? )?(what('?s| is)\s+(the\s+)?(date|day|time|year|today'?s date)(\s+(today|now|right now|is it|it is))?|what\s+(day|date|time|year)\s+is\s+(it|today)(\s+today)?|(tell me\s+)?(today'?s|todays|the current|current)\s+(date|day|time|year)|date\s+today|today'?s\s+date|time\s+now|what\s+is\s+today)$/.test(
    t,
  );
}

const NEWS_RE =
  /\b(news|latest|recent|recently|today|tonight|yesterday|this (week|month|year)|current(ly)?|right now|nowadays|updates?|happening|headlines?|trending|score|won|winner|election|results?|price of|stock|released?|launch(ed)?|who is the (current )?(president|prime minister|ceo|captain|chief minister)|20(2[4-9]|3\d))\b/;

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

async function fetchNews(query: string, request: Request): Promise<string | null> {
  const q = query
    .replace(/\[\[CODE_ONLY\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  if (!q) return null;
  const country = (request.headers.get("cf-ipcountry") || "US").toUpperCase().replace(/[^A-Z]/g, "") || "US";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-${country}&gl=${country}&ceid=${country}:en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LumenBot/1.0)" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const xml = await res.text();
  const items = xml.split("<item>").slice(1, 9).map((chunk) => {
    const get = (tag: string) => decodeXml(chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
    return { title: get("title"), date: get("pubDate"), source: get("source"), link: get("link") };
  }).filter((i) => i.title);
  if (!items.length) return null;
  const lines = items.map(
    (i, n) => `${n + 1}. ${i.title}${i.source ? ` — ${i.source}` : ""}${i.date ? ` (${i.date})` : ""}${i.link ? ` <${i.link}>` : ""}`,
  );
  return (
    `LIVE_NEWS (fresh web headlines fetched just now for the user's question):\n${lines.join("\n")}\n` +
    `Use these to give an up-to-date answer. Prefer the most recent items, mention dates, and cite sources as markdown links. ` +
    `If the headlines don't cover the question, answer from your knowledge and note it may not reflect the very latest developments.`
  );
}
