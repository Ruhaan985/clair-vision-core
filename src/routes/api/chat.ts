import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  generateText,
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
- When the user asks you to draw, generate, create, design, make, or imagine an image / picture / illustration / logo / artwork, CALL the generate_image tool with a vivid, detailed English prompt. Do NOT describe the image in text instead — actually call the tool. After it returns, give a one-line caption only; the image is rendered automatically.`;

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
          const model = gateway("google/gemini-3-flash-preview");

          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
            stopWhen: stepCountIs(5),
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
                    const imageModel = gateway(
                      "google/gemini-2.5-flash-image",
                    );
                    const res = await generateText({
                      model: imageModel,
                      prompt,
                    });
                    const file = res.files?.find((f) =>
                      f.mediaType?.startsWith("image/"),
                    );
                    if (!file) {
                      return { error: "No image was generated. Try a different prompt." };
                    }
                    const dataUrl = `data:${file.mediaType};base64,${file.base64}`;
                    return { imageUrl: dataUrl, mediaType: file.mediaType, prompt };
                  } catch (e) {
                    return {
                      error:
                        e instanceof Error ? e.message : "Image generation failed.",
                    };
                  }
                },
              }),
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});