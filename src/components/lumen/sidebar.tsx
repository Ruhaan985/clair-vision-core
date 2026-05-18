import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, Sparkles } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
  deleteThread,
  loadThreads,
  newThreadId,
  type Thread,
} from "@/lib/threads";
import { cn } from "@/lib/utils";
import logo from "@/assets/lumen-logo.png";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [threads, setThreads] = useState<Thread[]>([]);

  const refresh = useCallback(() => setThreads(loadThreads()), []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "lumen.threads.v1") refresh();
    };
    const onLocal = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("lumen:threads-changed", onLocal as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "lumen:threads-changed",
        onLocal as EventListener,
      );
    };
  }, [refresh]);

  const handleNew = () => {
    const id = newThreadId();
    navigate({ to: "/c/$threadId", params: { threadId: id } });
    onNavigate?.();
  };

  const handleDelete = (id: string) => {
    deleteThread(id);
    window.dispatchEvent(new CustomEvent("lumen:threads-changed"));
    refresh();
    if (id === activeId) navigate({ to: "/" });
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 glow-mint">
          <img
            src={logo}
            alt="Lumen"
            width={28}
            height={28}
            className="h-7 w-7"
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight">Lumen</span>
          <span className="text-[11px] text-muted-foreground">
            AI · always on
          </span>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={handleNew}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-primary/20 hover:border-primary/50"
        >
          <Plus className="h-4 w-4 text-primary transition-transform group-hover:rotate-90" />
          New conversation
        </button>
      </div>

      <div className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Recent
      </div>
      <nav className="thread-scroll flex-1 overflow-y-auto px-2 pb-3">
        {threads.length === 0 ? (
          <div className="mx-2 mt-2 rounded-lg border border-dashed border-sidebar-border p-4 text-xs text-muted-foreground">
            No conversations yet. Start one above.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => {
              const active = t.id === activeId;
              return (
                <li key={t.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Link
                      to="/c/$threadId"
                      params={{ threadId: t.id }}
                      onClick={onNavigate}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                    >
                      <MessageSquare
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{t.title || "New chat"}</span>
                    </Link>
                    <button
                      aria-label="Delete conversation"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          History is saved on this device.
        </div>
      </div>
    </aside>
  );
}