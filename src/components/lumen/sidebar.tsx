import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, Sparkles, ScrollText, Smartphone, Apple, LogIn, LogOut, User as UserIcon, Languages, Check, Shield } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  deleteThread,
  loadThreads,
  newThreadId,
  type Thread,
} from "@/lib/threads";
import { cn } from "@/lib/utils";
import logo from "@/assets/lumen-logo.png";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES, findLanguage, type Language } from "@/lib/languages";
import { useAdmin, usePresenceHeartbeat } from "@/hooks/use-admin";
import { AdminPanel } from "@/components/lumen/admin-panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [threads, setThreads] = useState<Thread[]>([]);
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const currentLang = findLanguage(language);
  const [langOpen, setLangOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const { isAdmin } = useAdmin();
  const [adminOpen, setAdminOpen] = useState(false);
  usePresenceHeartbeat();

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

  const filteredLangs = langQuery.trim()
    ? LANGUAGES.filter((l) => {
        const q = langQuery.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.native.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q)
        );
      })
    : LANGUAGES;
  const grouped = filteredLangs.reduce<Record<string, Language[]>>((acc, l) => {
    (acc[l.group] ||= []).push(l);
    return acc;
  }, {});

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
        {/* Account */}
        {user ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
              {(profile?.display_name || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">
                {profile?.display_name || user.email}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">Signed in</div>
            </div>
            <button
              onClick={async () => { await signOut(); toast.success("Signed out."); }}
              aria-label="Sign out"
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            onClick={onNavigate}
            className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary/25"
          >
            <LogIn className="h-3.5 w-3.5 text-primary" />
            Sign in / Create account
          </Link>
        )}

        {/* Language selector */}
        <Popover open={langOpen} onOpenChange={setLangOpen}>
          <PopoverTrigger asChild>
            <button
              className="mb-2 inline-flex w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs text-foreground transition hover:border-primary/50"
              aria-label="Choose language"
            >
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-primary" />
                {currentLang ? `${currentLang.name} · ${currentLang.native}` : "Language"}
              </span>
              <span className="text-[10px] text-muted-foreground">Change</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-72 p-0">
            <div className="border-b border-border p-2">
              <input
                autoFocus
                value={langQuery}
                onChange={(e) => setLangQuery(e.target.value)}
                placeholder="Search 40+ languages…"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {Object.keys(grouped).length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">No matches.</div>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </div>
                    {items.map((l) => {
                      const active = l.code === language;
                      return (
                        <button
                          key={l.code}
                          onClick={async () => {
                            await setLanguage(l.code);
                            setLangOpen(false);
                            setLangQuery("");
                            toast.success(`Language set to ${l.name}`);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                            active
                              ? "bg-primary/15 text-primary"
                              : "hover:bg-muted",
                          )}
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{l.name}</span>
                            <span className="ml-1.5 text-muted-foreground">{l.native}</span>
                          </span>
                          {active && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          {user ? "History is saved to your account." : "Sign in to save your chat history."}
        </div>
        <a
          href="https://www.mediafire.com/file/2bt47yqw4l9cf2v/app-release.apk/file"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary/20 hover:border-primary/50"
        >
          <Smartphone className="h-3.5 w-3.5 text-primary" />
          Download Android App
        </a>
        <a
          href="https://www.mediafire.com/file/e7duepyutt1454c/ios_source.tar.gz/file"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary/20 hover:border-primary/50"
        >
          <Apple className="h-3.5 w-3.5 text-primary" />
          Download iOS App
        </a>
        <Link
          to="/terms"
          onClick={onNavigate}
          className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-primary"
        >
          <ScrollText className="h-3 w-3" />
          Terms & Conditions
        </Link>
      </div>
    </aside>
  );
}