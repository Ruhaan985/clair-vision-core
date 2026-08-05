import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { LumenRank } from "@/lib/ranks";

export function useRank() {
  const { user } = useAuth();
  const [rank, setRank] = useState<LumenRank>("bronze");

  useEffect(() => {
    let active = true;
    if (!user) {
      setRank("bronze");
      return;
    }
    void supabase
      .from("user_ranks")
      .select("rank")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.rank) setRank(data.rank);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return rank;
}