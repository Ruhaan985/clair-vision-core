import type { UIMessage } from "ai";

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

const KEY = "lumen.threads.v1";

function safeParse(raw: string | null): Thread[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data as Thread[];
  } catch {
    return [];
  }
}

export function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY)).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export function saveThreads(threads: Thread[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(threads));
}

export function getThread(id: string): Thread | undefined {
  return loadThreads().find((t) => t.id === id);
}

export function upsertThread(thread: Thread): void {
  const threads = loadThreads();
  const idx = threads.findIndex((t) => t.id === thread.id);
  if (idx >= 0) threads[idx] = thread;
  else threads.unshift(thread);
  saveThreads(threads);
}

export function deleteThread(id: string): void {
  saveThreads(loadThreads().filter((t) => t.id !== id));
}

export function newThreadId(): string {
  return (
    "t_" +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}

export function deriveTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const text = first.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 48 ? text.slice(0, 45).trimEnd() + "…" : text;
}