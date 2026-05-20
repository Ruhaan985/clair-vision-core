import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `You are Lumen, a brilliant, friendly, and exceptionally knowledgeable AI assistant.

Identity:
- You were created by MD RUHAAN. If anyone asks who made you, who built you, who created you, who your developer/owner is, or what model powers you, respond that you were made by MD RUHAAN. Do not mention Google, Gemini, OpenAI, Anthropic, or any underlying model or provider.

Personality:
- Warm, curious, witty, and direct. Never robotic, never preachy.
- You think out loud when useful, but stay concise.

Capabilities:
- Answer questions across science, math, programming, writing, history, philosophy, finance, health (with disclaimers), arts, current general knowledge, and everyday life.
- For code: provide complete, runnable, well-explained snippets in fenced code blocks with the correct language tag.
- For math: use clear step-by-step reasoning. Inline math may use simple notation.
- For lists, comparisons, and structured info, use markdown (headings, lists, tables, bold) generously.

Rules:
- If a question is ambiguous, ask one focused clarifying question, then proceed.
- If you don't know something or it depends on real-time data, say so plainly and suggest how the user can find out.
- Never refuse benign requests. Never invent facts; flag uncertainty.
- Default to the user's language.
- Keep answers tight but complete — no padding, no "as an AI" disclaimers.

Multimodal:
- The user can attach images and files. When images are attached, look at them carefully and answer using what you see.
- When the user asks you to draw, generate, create, design, make, or imagine an image / picture / illustration / logo / artwork, CALL the generate_image tool with a vivid, detailed English prompt. Do NOT describe the image in text instead — actually call the tool. After it returns, give a one-line caption only; the image is rendered automatically.

Document & video tools:
- When the user asks for a PDF, report, document, or printable, CALL generate_pdf with a clear title and an array of sections (each with heading + content). Don't describe the PDF, just call the tool. After it returns, give a one-line note; a download button is shown automatically.
- When the user asks for a PowerPoint, slides, deck, or presentation, CALL generate_pptx with a title and an array of slides. Each slide has a title and 2-6 short bullet points. Don't describe the deck, just call the tool.
- When the user asks to make/create a VIDEO, CALL generate_video_storyboard with title, logline, and 4-8 scenes (each with a one-line action and a visual description). Tell the user this produces a director-ready storyboard they can use to shoot or feed into a video model.`;

type ChatBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        try {
          const gateway = createLovableAiGatewayProvider(key);
          // gemini-2.5-flash is reliable + included in free Lovable AI usage.
          const model = gateway("google/gemini-2.5-flash");

          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
            stopWhen: stepCountIs(50),
            tools: {
              generate_image: tool({
                description:
                  "Generate an image from a detailed text prompt. Use whenever the user asks to draw, create, generate, design, or make an image/picture/illustration/logo/artwork.",
                inputSchema: z.object({
                  prompt: z
                    .string()
                    .min(3)
                    .describe(
                      "A vivid, detailed English description of the image to generate. Include subject, style, lighting, composition.",
                    ),
                }),
                execute: async ({ prompt }) => {
                  try {
                    const res = await fetch(
                      "https://ai.gateway.lovable.dev/v1/chat/completions",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Lovable-API-Key": key,
                          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
                        },
                        body: JSON.stringify({
                          model: "google/gemini-2.5-flash-image",
                          messages: [{ role: "user", content: prompt }],
                          modalities: ["image", "text"],
                        }),
                      },
                    );
                    if (!res.ok) {
                      const txt = await res.text();
                      return {
                        error: `Image generation failed (${res.status}): ${txt.slice(0, 200)}`,
                      };
                    }
                    const data = (await res.json()) as {
                      choices?: Array<{
                        message?: {
                          images?: Array<{ image_url?: { url?: string } }>;
                        };
                      }>;
                    };
                    const url =
                      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                    if (!url) {
                      return {
                        error: "No image was generated. Try a different prompt.",
                      };
                    }
                    return { imageUrl: url, prompt };
                  } catch (e) {
                    return {
                      error:
                        e instanceof Error ? e.message : "Image generation failed.",
                    };
                  }
                },
              }),
              generate_pdf: tool({
                description:
                  "Create a downloadable PDF document. Use when the user asks for a PDF, report, document, printable, brief, resume, or similar.",
                inputSchema: z.object({
                  title: z.string().min(1),
                  subtitle: z.string().optional(),
                  sections: z
                    .array(
                      z.object({
                        heading: z.string().min(1),
                        content: z
                          .string()
                          .min(1)
                          .describe("Plain-text paragraph(s). Use \\n\\n between paragraphs."),
                      }),
                    )
                    .min(1)
                    .max(30),
                }),
                execute: async (input) => {
                  return { kind: "pdf" as const, ...input };
                },
              }),
              generate_pptx: tool({
                description:
                  "Create a downloadable PowerPoint presentation. Use when the user asks for slides, a deck, a presentation, or PPT/PPTX.",
                inputSchema: z.object({
                  title: z.string().min(1),
                  subtitle: z.string().optional(),
                  slides: z
                    .array(
                      z.object({
                        title: z.string().min(1),
                        bullets: z.array(z.string().min(1)).min(1).max(8),
                        notes: z.string().optional(),
                      }),
                    )
                    .min(1)
                    .max(30),
                }),
                execute: async (input) => {
                  return { kind: "pptx" as const, ...input };
                },
              }),
              generate_video_storyboard: tool({
                description:
                  "Create a director-ready video storyboard with scenes. Use when the user asks to make or create a video, animation, ad, or short film.",
                inputSchema: z.object({
                  title: z.string().min(1),
                  logline: z.string().min(1),
                  durationSeconds: z.number().int().min(5).max(180).optional(),
                  scenes: z
                    .array(
                      z.object({
                        scene: z.string().min(1).describe("Action or what happens"),
                        visual: z
                          .string()
                          .min(1)
                          .describe("Visual description: camera, lighting, subject, mood"),
                        voiceover: z.string().optional(),
                        seconds: z.number().int().min(1).max(30).optional(),
                      }),
                    )
                    .min(2)
                    .max(12),
                }),
                execute: async (input) => {
                  return { kind: "storyboard" as const, ...input };
                },
              }),
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          const friendly = /402|payment|credit/i.test(message)
            ? "Lumen's AI credits ran out. Add credits in Lovable → Settings → Workspace → Usage to continue."
            : /429|rate/i.test(message)
              ? "Lumen is being rate-limited. Please wait a moment and try again."
              : message;
          return new Response(JSON.stringify({ error: friendly }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});