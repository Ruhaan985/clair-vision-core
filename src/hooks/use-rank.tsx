import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { LumenRank } from "@/lib/ranks";

export function useRankState() {
  const { user } = useAuth();
  const [rank, setRank] = useState<LumenRank>("bronze");
  const [points, setPoints] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setRank("bronze");
      setPoints(0);
      return;
    }
    const { data } = await supabase
      .from("user_ranks")
      .select("rank, points")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.rank) setRank(data.rank as LumenRank);
    setPoints((data?.points as number) ?? 0);
  }, [user?.id]);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener("lumen:points-changed", onChange);
    return () => window.removeEventListener("lumen:points-changed", onChange);
  }, [load]);

  return { rank, points, refresh: load };
}

export function useRank() {
  return useRankState().rank;
}
