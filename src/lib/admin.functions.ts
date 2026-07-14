import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SUSPENSION_REASONS = [
  "Cheating",
  "Harassment or abuse",
  "Spam",
  "Hate speech",
  "Illegal activity",
  "Impersonation",
  "Other",
] as const;
export type SuspensionReason = (typeof SUSPENSION_REASONS)[number];

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminEmail = "wo1359rk@gmail.com";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const claimEmail = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    if (!data && claimEmail === adminEmail) {
      const { error: grantError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: context.userId, role: "admin" });
      if (grantError && grantError.code !== "23505") throw new Error(grantError.message);
      return { isAdmin: true };
    }

    return { isAdmin: !!data };
  });

export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const getMySuspension = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_suspensions")
      .select("reason, message, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { suspension: (data as { reason: string; message: string; created_at: string } | null) ?? null };
  });

async function assertAdmin(context: { userId: string; claims: Record<string, unknown> }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) {
    const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    if (email !== "wo1359rk@gmail.com") throw new Error("Forbidden");
  }
  return supabaseAdmin;
}

export const suspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; reason: string; message: string }) => data)
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You cannot suspend yourself.");
    const admin = await assertAdmin(context);
    // Prevent suspending another admin
    const { data: targetRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (targetRole) throw new Error("Cannot suspend an admin.");
    const { error } = await admin
      .from("user_suspensions")
      .upsert(
        {
          user_id: data.userId,
          reason: data.reason,
          message: data.message,
          suspended_by: context.userId,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { error } = await admin.from("user_suspensions").delete().eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminOverview = {
  totals: {
    accounts: number;
    online_now: number;
    active_24h: number;
    active_7d: number;
    signups_today: number;
    signups_7d: number;
  };
  languages: Array<{ language: string; count: number }>;
  online: Array<{
    user_id: string;
    display_name: string;
    email: string | null;
    last_seen_at: string | null;
  }>;
  accounts: Array<{
    user_id: string;
    display_name: string;
    email: string | null;
    preferred_language: string;
    created_at: string;
    last_seen_at: string | null;
    last_sign_in_at: string | null;
    is_admin: boolean;
    suspension: { reason: string; message: string; created_at: string } | null;
  }>;
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adminEmail = "wo1359rk@gmail.com";
    const claimEmail = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    const { data: roleRows, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1);
    if (roleErr) throw new Error(roleErr.message);
    if ((roleRows ?? []).length === 0) {
      if (claimEmail !== adminEmail) throw new Error("Forbidden");
      const { error: grantError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: context.userId, role: "admin" });
      if (grantError && grantError.code !== "23505") throw new Error(grantError.message);
    }

    // 1) All profiles
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, preferred_language, created_at, last_seen_at")
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    // 2) All auth users (paginated; page 1 is plenty for a small app)
    const { data: authList, error: aErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (aErr) throw new Error(aErr.message);
    const emailById = new Map<string, { email: string | null; last_sign_in_at: string | null }>();
    for (const u of authList.users) {
      emailById.set(u.id, { email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null });
    }

    // 3) Admin role set
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = new Set((adminRoles ?? []).map((r) => r.user_id as string));

    const { data: suspensionRows } = await supabaseAdmin
      .from("user_suspensions")
      .select("user_id, reason, message, created_at");
    const suspensionMap = new Map<string, { reason: string; message: string; created_at: string }>();
    for (const s of suspensionRows ?? []) {
      suspensionMap.set(s.user_id as string, {
        reason: s.reason as string,
        message: s.message as string,
        created_at: s.created_at as string,
      });
    }

    const now = Date.now();
    const ONLINE_MS = 2 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;

    const accounts = (profiles ?? []).map((p) => {
      const meta = emailById.get(p.user_id as string);
      return {
        user_id: p.user_id as string,
        display_name: (p.display_name as string) ?? "",
        email: meta?.email ?? null,
        preferred_language: (p.preferred_language as string) ?? "en",
        created_at: p.created_at as string,
        last_seen_at: (p.last_seen_at as string | null) ?? null,
        last_sign_in_at: meta?.last_sign_in_at ?? null,
        is_admin: adminIds.has(p.user_id as string),
        suspension: suspensionMap.get(p.user_id as string) ?? null,
      };
    });

    const online = accounts
      .filter((a) => a.last_seen_at && now - new Date(a.last_seen_at).getTime() < ONLINE_MS)
      .sort((a, b) =>
        new Date(b.last_seen_at!).getTime() - new Date(a.last_seen_at!).getTime(),
      )
      .map(({ user_id, display_name, email, last_seen_at }) => ({
        user_id,
        display_name,
        email,
        last_seen_at,
      }));

    const langCounts = new Map<string, number>();
    for (const a of accounts) {
      langCounts.set(a.preferred_language, (langCounts.get(a.preferred_language) ?? 0) + 1);
    }
    const languages = [...langCounts.entries()]
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    const totals = {
      accounts: accounts.length,
      online_now: online.length,
      active_24h: accounts.filter(
        (a) => a.last_seen_at && now - new Date(a.last_seen_at).getTime() < DAY_MS,
      ).length,
      active_7d: accounts.filter(
        (a) => a.last_seen_at && now - new Date(a.last_seen_at).getTime() < 7 * DAY_MS,
      ).length,
      signups_today: accounts.filter(
        (a) => now - new Date(a.created_at).getTime() < DAY_MS,
      ).length,
      signups_7d: accounts.filter(
        (a) => now - new Date(a.created_at).getTime() < 7 * DAY_MS,
      ).length,
    };

    return { totals, languages, online, accounts };
  });