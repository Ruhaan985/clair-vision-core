import { useEffect, useState } from "react";
import { Loader2, Trophy, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/ranks.functions";
import { RankBadge } from "@/components/lumen/rank-badge";
import { MAX_RANK_POINTS } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const fetchBoard = useServerFn(getLeaderboard);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchBoard()
      .then((r) => live && setEntries(r.entries))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Could not load leaderboard"));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur">
      <div className="animate-msg-in w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Lumen Leaderboard</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-3">
          {error ? (
            <p className="p-6 text-center text-xs text-destructive">{error}</p>
          ) : !entries ? (
            <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading ranks…
            </div>
          ) : entries.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">No ranked members yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {entries.map((e, i) => (
                <li
                  key={e.user_id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2",
                    i === 0 && "border-primary/50 bg-primary/5",
                  )}
                >
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.display_name}</span>
                  <RankBadge rank={e.rank} />
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {e.points.toLocaleString()} pts
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Ranks upgrade automatically with points — Arch Nemesis at {MAX_RANK_POINTS.toLocaleString()} pts.
          </p>
        </div>
      </div>
    </div>
  );
}
