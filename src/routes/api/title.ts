import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/title")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { userText, assistantText } = (await request.json()) as {
          userText?: string;
          assistantText?: string;
        };
        if (!userText) return new Response(JSON.stringify({ title: "" }), { status: 200 });

        const sys =
          "You write extremely catchy, vivid chat titles. 2–5 words max, Title Case, no quotes, no trailing punctuation, no emojis. Be punchy and specific to the topic. Return ONLY the title.";
        const user = `User asked: ${userText.slice(0, 600)}\n\nAssistant replied: ${(assistantText ?? "").slice(0, 400)}\n\nTitle:`;

        const apiKey = process.env.LOVABLE_API_KEY;
        let title = "";
        try {
          if (apiKey) {
            const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: sys },
                  { role: "user", content: user },
                ],
                temperature: 0.9,
                max_tokens: 24,
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
              title = data.choices?.[0]?.message?.content ?? "";
            }
          }
          if (!title) {
            const res = await fetch("https://text.pollinations.ai/openai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "openai",
                messages: [
                  { role: "system", content: sys },
                  { role: "user", content: user },
                ],
                private: true,
                temperature: 0.9,
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
              title = data.choices?.[0]?.message?.content ?? "";
            }
          }
        } catch { /* ignore */ }

        title = (title || "")
          .replace(/^["'`\s]+|["'`\s.!?]+$/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 48);

        return new Response(JSON.stringify({ title }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});