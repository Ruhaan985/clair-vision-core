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
  Paperclip,
  FileText,
  X,
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

type Attachment = {
  id: string;
  file: File;
  url: string; // data URL
  isImage: boolean;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!trimmed && attachments.length === 0) || isBusy) return;
    const files = attachments.map((a) => ({
      type: "file" as const,
      mediaType: a.file.type || "application/octet-stream",
      url: a.url,
      filename: a.file.name,
    }));
    sendMessage({ text: trimmed || "(see attached)", files });
    setInput("");
    setAttachments([]);
    // Update URL if we're not already there (defensive)
    navigate({ to: "/c/$threadId", params: { threadId } });
  };

  const addFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const next: Attachment[] = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is too large (max 8 MB).`);
        continue;
      }
      try {
        const url = await fileToDataUrl(file);
        next.push({
          id: Math.random().toString(36).slice(2),
          file,
          url,
          isImage: file.type.startsWith("image/"),
        });
      } catch {
        toast.error(`Could not read ${file.name}`);
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full flex-1 flex-col aurora-bg">
      <header className="flex items-center justify-between border-b border-border/60 bg-background/40 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60" />
          <span className="text-sm font-medium tracking-tight">Lumen</span>
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
                    <MessageBody message={m} />
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
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="group relative flex items-center gap-2 rounded-lg border border-border bg-card/80 p-1.5 pr-2 text-xs"
                >
                  {a.isImage ? (
                    <img
                      src={a.url}
                      alt={a.file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/15 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  <span className="max-w-[140px] truncate text-foreground/80">
                    {a.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((p) => p.filter((x) => x.id !== a.id))
                    }
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div
            className={cn(
              "group relative flex items-end gap-2 rounded-2xl border border-border bg-card/80 p-2 pl-4 shadow-lg transition-all",
              "focus-within:border-primary/60 focus-within:glow-mint",
            )}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/*,.md,.json,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </button>
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
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files);
                if (files.length) {
                  e.preventDefault();
                  void addFiles(files);
                }
              }}
              rows={1}
              placeholder="Ask Lumen anything, attach an image, or say ‘draw…’"
              className="flex-1 resize-none bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              disabled={isBusy && status !== "streaming"}
            />
            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isBusy}
              aria-label="Send"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                (input.trim() || attachments.length) && !isBusy
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