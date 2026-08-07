import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/lumen-logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Change password — Lumen" },
      { name: "description", content: "Set a new password for your Lumen account." },
      { property: "og:title", content: "Change password — Lumen" },
      { property: "og:description", content: "Set a new password for your Lumen account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated.");
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <img src={logo} alt="" className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Change your password</h1>
            <p className="text-xs text-muted-foreground">
              Pick a new password for your Lumen account.
            </p>
          </div>
        </div>

        {!loading && !user ? (
          <p className="rounded-lg border border-border bg-background/60 p-4 text-xs text-muted-foreground">
            Open the reset link from your email, or{" "}
            <Link to="/auth" className="text-primary hover:underline">sign in</Link> first.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">New password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update password
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">← Back to chat</Link>
        </div>
      </div>
    </main>
  );
}
