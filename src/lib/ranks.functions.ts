import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LUMEN_RANKS, type LumenRank } from "@/lib/ranks";

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  rank: LumenRank;
  points: number;
};

/** Public leaderboard: display names, ranks and points only. */
export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: LeaderboardEntry[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ranks } = await supabaseAdmin
      .from("user_ranks")
      .select("user_id, rank, points")
      .order("points", { ascending: false })
      .limit(50);
    // Rank tier is the primary sort key; points only break ties inside a tier.
    const rankIndex = (r: string) => LUMEN_RANKS.indexOf(r as LumenRank);
    const sorted = [...(ranks ?? [])].sort((a, b) => {
      const diff = rankIndex(b.rank as string) - rankIndex(a.rank as string);
      if (diff !== 0) return diff;
      return ((b.points as number) ?? 0) - ((a.points as number) ?? 0);
    });
    const ids = sorted.map((r) => r.user_id as string);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", ids)
      : { data: [] as Array<{ user_id: string; display_name: string }> };
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string) || "Anonymous"]),
    );
    return {
      entries: sorted.map((r) => ({
        user_id: r.user_id as string,
        display_name: nameById.get(r.user_id as string) ?? "Anonymous",
        rank: r.rank as LumenRank,
        points: (r.points as number) ?? 0,
      })),
    };
  },
);

/** Award a small, fixed amount of points for using Lumen. */
export const awardPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ points: number; rank: LumenRank }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const AWARD = 5;
    const { data: existing } = await supabaseAdmin
      .from("user_ranks")
      .select("points")
      .eq("user_id", context.userId)
      .maybeSingle();
    const points = Math.min(10000, ((existing?.points as number) ?? 0) + AWARD);
    const { data, error } = await supabaseAdmin
      .from("user_ranks")
      .upsert({ user_id: context.userId, points }, { onConflict: "user_id" })
      .select("points, rank")
      .single();
    if (error) throw new Error(error.message);
    return { points: (data.points as number) ?? points, rank: data.rank as LumenRank };
  });
