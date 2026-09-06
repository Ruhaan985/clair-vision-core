import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, ScrollText, Smartphone, Apple, LogIn, LogOut, Languages, Check, Shield, Trophy, KeyRound } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  deleteThread,
  loadThreads,
  newThreadId,
  type Thread,
} from "@/lib/threads";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES, findLanguage, type Language } from "@/lib/languages";
import { useAdmin, usePresenceHeartbeat } from "@/hooks/use-admin";
import { AdminPanel } from "@/components/lumen/admin-panel";
import { useRankState } from "@/hooks/use-rank";
import { rankProgress, RANK_DETAILS } from "@/lib/ranks";
import { RankBadge } from "@/components/lumen/rank-badge";
import { Leaderboard } from "@/components/lumen/leaderboard";
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
  const { rank, points } = useRankState();
  const progress = rankProgress(points);
  const [adminOpen, setAdminOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
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
    <>
    {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    {boardOpen && <Leaderboard onClose={() => setBoardOpen(false)} />}
    <aside className="flex h-full w-[272px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 text-sidebar-foreground">
      <div className="mb-7 flex items-center gap-2.5">
        <AsterMark className="h-[30px] w-[30px]" />
        <div className="flex flex-col leading-none">
          <span className="font-serif text-[19px] font-normal">Lumen</span>
          <span className="mt-1 text-[11px] text-foreground/30">
            AI · always on
          </span>
        </div>
      </div>

      <div>
        <button
          onClick={handleNew}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-transparent px-3 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
          New conversation
        </button>
      </div>

      <div className="mb-2 mt-6 px-0.5 text-[11px] font-medium uppercase text-foreground/30">
        Recent
      </div>
      <nav className="thread-scroll flex-1 overflow-y-auto pb-3">
        {threads.length === 0 ? (
          <div className="px-0.5 py-1 text-[12.5px] leading-5 text-foreground/30">
            No conversations yet.<br />Start one above.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => {
              const active = t.id === activeId;
              return (
                <li key={t.id}>
                  <div
                    className={cn(
                       "group flex items-center gap-2 rounded-md px-2 py-2 transition-colors",
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

      <div className="space-y-3 text-[11px] text-muted-foreground">
        {/* Account */}
        {user ? (
          <div className="rounded-lg border border-sidebar-border/70 p-3">
            <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-muted text-[10px] font-semibold text-foreground/75">
              {(profile?.display_name || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">
                {profile?.display_name || user.email}
              </div>
               <div className="mt-1 flex items-center gap-1.5">
                <RankBadge rank={rank} />
                <span className="truncate text-[10px] text-muted-foreground">
                  {points.toLocaleString()} pts
                </span>
              </div>
               <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                   className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round(progress.pct * 100)}%` }}
                />
              </div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {progress.next
                  ? `${progress.remaining.toLocaleString()} pts to ${RANK_DETAILS[progress.next].label}`
                  : "Max rank reached"}
              </div>
            </div>
             <button
              onClick={async () => { await signOut(); toast.success("Signed out."); }}
              aria-label="Sign out"
               className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <LogOut className="h-3.5 w-3.5" />
             </button>
            </div>
          </div>
        ) : (
          <Link
            to="/auth"
            onClick={onNavigate}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-2.5 py-2 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-foreground/[0.025]"
          >
            <LogIn className="h-3.5 w-3.5 text-primary" />
            Sign in / Create account
          </Link>
        )}

        <div className="flex flex-col gap-0.5">
        <button
          onClick={() => setBoardOpen(true)}
          className="inline-flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-[12.5px] text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"
        >
          <Trophy className="h-3.5 w-3.5 text-primary" />
          Leaderboard
        </button>

        {user && (
          <Link
            to="/reset-password"
            onClick={onNavigate}
            className="inline-flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-[12.5px] text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"
          >
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            Change password
          </Link>
        )}

        {isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            className="inline-flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-[12.5px] text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"
          >
            <Shield className="h-3.5 w-3.5 text-primary" />
            Admin console
          </button>
        )}

        {/* Language selector */}
        <Popover open={langOpen} onOpenChange={setLangOpen}>
          <PopoverTrigger asChild>
            <button
               className="inline-flex w-full items-center justify-between gap-1.5 rounded-md px-1.5 py-2 text-[12.5px] text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"
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
        </div>

        <div className="px-1.5 text-[10.5px] text-foreground/30">
          {user ? "History is saved to your account." : "Sign in to save your chat history."}
        </div>
        <a
          href="https://www.mediafire.com/file/2bt47yqw4l9cf2v/app-release.apk/file"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Smartphone className="h-3.5 w-3.5 text-primary" />
          Download Android App
        </a>
        <a
          href="https://www.mediafire.com/file/e7duepyutt1454c/ios_source.tar.gz/file"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Apple className="h-3.5 w-3.5 text-primary" />
          Download iOS App
        </a>
        <Link
          to="/terms"
          onClick={onNavigate}
          className="inline-flex items-center gap-1.5 px-1.5 text-foreground/30 transition hover:text-foreground"
        >
          <ScrollText className="h-3 w-3" />
          Terms & Conditions
        </Link>
      </div>
    </aside>
    </>
  );
}

function AsterMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <path d="M15 22V6M15 6l-3 4.5M15 6l3 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 24s4-3.5 11-3.5S26 24 26 24" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}