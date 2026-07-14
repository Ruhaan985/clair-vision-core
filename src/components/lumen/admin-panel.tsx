import { useEffect, useState } from "react";
import { X, Users, Activity, Loader2, Shield, Globe2, RefreshCw, Ban, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminOverview,
  suspendUser,
  unsuspendUser,
  SUSPENSION_REASONS,
  type AdminOverview,
} from "@/lib/admin.functions";
import { findLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "online" | "accounts">("overview");
  const [suspendTarget, setSuspendTarget] = useState<AdminOverview["accounts"][number] | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getAdminOverview()
      .then((r) => setData(r))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 30_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border bg-primary/5 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Lumen Admin</div>
              <div className="text-[10px] text-muted-foreground">Developer console · you only</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <nav className="flex gap-1 border-b border-border px-3 py-2">
          {(["overview", "online", "accounts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                tab === t
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t === "online" && data ? `Online · ${data.totals.online_now}` : t}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && !data ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : !data ? null : tab === "overview" ? (
            <Overview data={data} />
          ) : tab === "online" ? (
            <OnlineList data={data} />
          ) : (
            <AccountsList
              data={data}
              onSuspend={(a) => setSuspendTarget(a)}
              onUnsuspend={async (a) => {
                try {
                  await unsuspendUser({ data: { userId: a.user_id } });
                  toast.success(`Unsuspended ${a.display_name || a.email}`);
                  load();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            />
          )}
        </div>

        {suspendTarget && (
          <SuspendDialog
            account={suspendTarget}
            onClose={() => setSuspendTarget(null)}
            onDone={() => {
              setSuspendTarget(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function SuspendDialog({
  account,
  onClose,
  onDone,
}: {
  account: AdminOverview["accounts"][number];
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<string>(SUSPENSION_REASONS[0]);
  const [message, setMessage] = useState<string>(
    "Your account has been suspended for violating our terms of service.",
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      toast.error("Ban message is required.");
      return;
    }
    setSubmitting(true);
    try {
      await suspendUser({ data: { userId: account.user_id, reason, message: message.trim() } });
      toast.success(`Suspended ${account.display_name || account.email}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-destructive/40 bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          <div className="text-sm font-semibold">Suspend account</div>
        </div>
        <div className="mb-3 rounded-lg border border-border bg-background/60 p-2 text-xs">
          <div className="font-medium">{account.display_name || "—"}</div>
          <div className="text-muted-foreground">{account.email ?? "—"}</div>
        </div>

        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
        >
          {SUSPENSION_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Ban message (shown to user)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</div>
    </div>
  );
}

function Overview({ data }: { data: AdminOverview }) {
  const t = data.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Accounts" value={t.accounts} icon={<Users className="h-3 w-3" />} />
        <Stat label="Online now" value={t.online_now} icon={<Activity className="h-3 w-3 text-emerald-400" />} />
        <Stat label="Active 24h" value={t.active_24h} />
        <Stat label="Active 7d" value={t.active_7d} />
        <Stat label="Signups today" value={t.signups_today} />
        <Stat label="Signups 7d" value={t.signups_7d} />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Globe2 className="h-3.5 w-3.5" /> Languages
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.languages.map((l) => {
            const meta = findLanguage(l.language);
            return (
              <span
                key={l.language}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-2 py-1 text-[11px]"
              >
                <span className="font-medium">{meta ? meta.name : l.language}</span>
                <span className="text-muted-foreground">· {l.count}</span>
              </span>
            );
          })}
          {data.languages.length === 0 && (
            <span className="text-xs text-muted-foreground">No data yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function OnlineList({ data }: { data: AdminOverview }) {
  if (data.online.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Nobody is online right now.</div>;
  }
  return (
    <ul className="space-y-1.5">
      {data.online.map((u) => (
        <li
          key={u.user_id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{u.display_name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{u.email ?? "—"}</div>
          </div>
          <div className="text-[11px] text-muted-foreground">{timeAgo(u.last_seen_at)}</div>
        </li>
      ))}
    </ul>
  );
}

function AccountsList({
  data,
  onSuspend,
  onUnsuspend,
}: {
  data: AdminOverview;
  onSuspend: (a: AdminOverview["accounts"][number]) => void;
  onUnsuspend: (a: AdminOverview["accounts"][number]) => void;
}) {
  const [q, setQ] = useState("");
  const rows = data.accounts.filter((a) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      a.display_name.toLowerCase().includes(s) ||
      (a.email ?? "").toLowerCase().includes(s)
    );
  });
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${data.accounts.length} accounts…`}
        className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Lang</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Last seen</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.user_id} className="border-t border-border/60">
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-1.5">
                    {a.display_name || "—"}
                    {a.is_admin && (
                      <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                        admin
                      </span>
                    )}
                    {a.suspension && (
                      <span
                        title={`${a.suspension.reason}: ${a.suspension.message}`}
                        className="rounded bg-destructive/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive"
                      >
                        suspended
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{a.email ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.preferred_language}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{timeAgo(a.last_seen_at)}</td>
                <td className="px-3 py-2">
                  {a.is_admin ? (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  ) : a.suspension ? (
                    <button
                      onClick={() => onUnsuspend(a)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted"
                    >
                      <Undo2 className="h-3 w-3" /> Unsuspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onSuspend(a)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20"
                    >
                      <Ban className="h-3 w-3" /> Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}