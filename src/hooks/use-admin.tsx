import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, heartbeat } from "@/lib/admin.functions";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsAdmin(false);
      setChecked(true);
      return;
    }
    setChecked(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!alive) return;
        if (data?.role === "admin") {
          setIsAdmin(true);
          return;
        }
        if (!error || error.code === "PGRST116") {
          setIsAdmin(false);
          return;
        }
        const r = await checkIsAdmin();
        if (alive) setIsAdmin(!!r.isAdmin);
      })
      .catch(() => alive && setIsAdmin(false))
      .finally(() => alive && setChecked(true));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return { isAdmin, checked };
}

// Fire-and-forget presence heartbeat while signed in.
export function usePresenceHeartbeat() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      heartbeat().catch(() => undefined);
    };
    tick();
    const interval = window.setInterval(tick, 45_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);
}