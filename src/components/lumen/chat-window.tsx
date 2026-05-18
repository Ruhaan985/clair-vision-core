import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Code2,
  Compass,
  Lightbulb,
  PenLine,
  Send,
  Square,
} from "lucide-react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { getThread, upsertThread, deriveTitle } from "@/lib/threads";
import { cn } from "@/lib/utils";
import logo from "@/assets/lumen-logo.png";

function renderText(message: UIMessage): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    title: "Explain anything",
    prompt: "Explain quantum entanglement like I'm 12, then like I'm a physics PhD.",
  },
  {
    icon: Code2,
    title: "Write code",
    prompt:
      "Write a React hook called useDebouncedValue with TypeScript and explain how it works.",
  },
  {
    icon: PenLine,
    title: "Help me write",
    prompt: "Draft a concise, friendly cold email pitching a design service to a startup founder.",
  },
  {
    icon: Compass,
    title: "Plan something",
    prompt: "Plan a 5-day solo trip to Tokyo for a first-time visitor on a mid-range budget.",
  },
];

export function ChatWindow({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const initial = useMemo(() => getThread(threadId), [threadId]);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initial?.messages ?? [],
    transport,
    onError: (e) => {
      toast.error(e?.message || "Something went wrong. Please try again.");
    },
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = status === "submitted" || status === "streaming";

  // Persist on every update
  useEffect(() => {
    if (messages.length === 0) return;
    upsertThread({
      id: threadId,
      title: deriveTitle(messages),
      createdAt: initial?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      messages,
    });
    window.dispatchEvent(new CustomEvent("lumen:threads-changed"));
  }, [messages, threadId, initial?.createdAt]);

  // Keep textarea focused
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [input]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
    // Update URL if we're not already there (defensive)
    navigate({ to: "/c/$threadId", params: { threadId } });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full flex-1 flex-col aurora-bg">
      <header className="flex items-center justify-between border-b border-border/60 bg-background/40 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60" />
          <span className="text-sm font-medium tracking-tight">Lumen</span>
          <span className="text-xs text-muted-foreground">· gemini-3-flash</span>
        </div>
        {isBusy && (
          <button
            onClick={() => stop()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Square className="h-3 w-3" /> Stop
          </button>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {isEmpty ? (
          <EmptyState onPick={submit} />
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
              {messages.map((m) => (
                <Message from={m.role} key={m.id} className="mb-5">
                  <MessageContent>
                    {m.role === "assistant" ? (
                      <div className="prose-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {renderText(m)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{renderText(m)}</div>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && (
                <Message from="assistant" className="mb-5">
                  <MessageContent>
                    <Shimmer>Thinking…</Shimmer>
                  </MessageContent>
                </Message>
              )}
              {error && (
                <div className="mx-auto mt-2 max-w-prose rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                  {error.message}
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      <div className="border-t border-border/60 bg-background/40 px-4 py-4 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mx-auto w-full max-w-3xl"
        >
          <div
            className={cn(
              "group relative flex items-end gap-2 rounded-2xl border border-border bg-card/80 p-2 pl-4 shadow-lg transition-all",
              "focus-within:border-primary/60 focus-within:glow-mint",
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Ask Lumen anything…"
              className="flex-1 resize-none bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              disabled={isBusy && status !== "streaming"}
            />
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              aria-label="Send"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                input.trim() && !isBusy
                  ? "bg-primary text-primary-foreground hover:brightness-110 glow-mint"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            Lumen can be wrong. Verify important info. Press <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Shift</kbd>+<kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> for a new line.
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 pb-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 glow-mint">
          <img src={logo} alt="Lumen" width={48} height={48} className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          How can I help you today?
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Ask Lumen anything — code, ideas, plans, explanations, writing, math.
          I'll do my best.
        </p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={() => onPick(s.prompt)}
              className="group rounded-xl border border-border bg-card/60 p-4 text-left transition-all hover:border-primary/50 hover:bg-card hover:-translate-y-0.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {s.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}