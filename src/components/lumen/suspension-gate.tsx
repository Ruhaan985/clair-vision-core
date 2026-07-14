import { useEffect, useState, type ReactNode } from "react";
import { Ban, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Suspension = { reason: string; message: string; created_at: string };

export function SuspensionGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [suspension, setSuspension] = useState<Suspension | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setSuspension(null);
      setChecked(true);
      return;
    }
    setChecked(false);
    const load = async () => {
      const { data } = await supabase
        .from("user_suspensions")
        .select("reason, message, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      setSuspension((data as Suspension | null) ?? null);
      setChecked(true);
    };
    void load();
    const t = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [user?.id]);

  if (user && checked && suspension) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Account suspended</div>
              <div className="text-xs text-muted-foreground">
                Reason: <span className="font-medium text-foreground">{suspension.reason}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {suspension.message}
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Suspended on {new Date(suspension.created_at).toLocaleString()}. If you believe this is a
            mistake, contact support.
          </div>
          <button
            onClick={() => void signOut()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}