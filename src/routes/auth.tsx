import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/lumen-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Lumen" },
      { name: "description", content: "Sign in or create your Lumen account to save chats and unlock every feature." },
    ],
  }),
});

const signUpSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(40, "Name must be under 40 characters")
    .regex(/^[a-zA-Z0-9_. -]+$/i, "Only letters, numbers, spaces, . _ -"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", display_name: "" });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        // Check display-name availability first (public RPC).
        const { data: available, error: rpcErr } = await supabase.rpc(
          "display_name_available",
          { _name: parsed.data.display_name },
        );
        if (rpcErr) {
          toast.error(rpcErr.message);
          return;
        }
        if (!available) {
          toast.error("That display name is taken. Pick a different one.");
          return;
        }
        const redirectTo = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: redirectTo,
            data: { display_name: parsed.data.display_name },
          },
        });
        if (error) {
          if (/registered|exists/i.test(error.message)) {
            toast.error("An account with that email already exists. Try signing in.");
          } else if (/display_name|duplicate|unique/i.test(error.message)) {
            toast.error("That display name is taken. Pick a different one.");
          } else toast.error(error.message);
          return;
        }
        // The `on_auth_user_created_lumen` trigger creates the profile row.
        if (!data.session) {
          toast.success("Check your email to confirm your Lumen account.");
          setMode("signin");
        } else {
          toast.success("Welcome to Lumen!");
          navigate({ to: "/" });
        }
      } else {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          if (/invalid/i.test(error.message)) toast.error("Wrong email or password.");
          else if (/confirm/i.test(error.message)) toast.error("Please confirm your email first.");
          else toast.error(error.message);
          return;
        }
        toast.success("Signed in.");
        navigate({ to: "/" });
      }
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
            <h1 className="text-lg font-semibold tracking-tight">
              {mode === "signin" ? "Sign in to Lumen" : "Create your Lumen account"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {mode === "signin"
                ? "Welcome back."
                : "One account per person — display names are unique."}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Display name</label>
              <input
                type="text"
                autoComplete="nickname"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. ruhaan"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              New to Lumen?{" "}
              <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </>
          )}
          <div className="mt-3">
            <Link to="/" className="hover:text-primary">← Back to chat</Link>
          </div>
        </div>
      </div>
    </main>
  );
}