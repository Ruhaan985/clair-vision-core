import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLumenAdmin } from "@/lib/admin.server";
import { RANK_DETAILS, type LumenRank } from "@/lib/ranks";

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

export const suspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; reason: string; message: string }) => data)
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You cannot suspend yourself.");
    const admin = await assertLumenAdmin(context);
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
    const admin = await assertLumenAdmin(context);
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
    rank: LumenRank;
    points: number;
  }>;
};

export const grantUserPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; amount: number }) => data)
  .handler(async ({ data, context }) => {
    const admin = await assertLumenAdmin(context);
    if (!(POINT_GRANTS as readonly number[]).includes(data.amount)) {
      throw new Error("Invalid point amount");
    }
    const { data: existing } = await admin
      .from("user_ranks")
      .select("points")
      .eq("user_id", data.userId)
      .maybeSingle();
    const points = Math.max(0, Math.min(10000, ((existing?.points as number) ?? 0) + data.amount));
    const { data: row, error } = await admin
      .from("user_ranks")
      .upsert(
        {
          user_id: data.userId,
          points,
          assigned_by: context.userId,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("points, rank")
      .single();
    if (error) throw new Error(error.message);
    return { points: (row.points as number) ?? points, rank: row.rank as LumenRank };
  });

export const assignUserRank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; rank: LumenRank }) => data)
  .handler(async ({ data, context }) => {
    const admin = await assertLumenAdmin(context);
    const allowed: LumenRank[] = ["bronze", "silver", "gold", "platinum", "diamond", "onyx", "nemesis", "arch_nemesis"];
    if (!allowed.includes(data.rank)) throw new Error("Invalid rank");
    const { error } = await admin.from("user_ranks").upsert(
      {
        user_id: data.userId,
        rank: data.rank,
        points: RANK_DETAILS[data.rank].points,
        assigned_by: context.userId,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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

    const { data: rankRows, error: rankErr } = await supabaseAdmin
      .from("user_ranks")
      .select("user_id, rank, points");
    if (rankErr) throw new Error(rankErr.message);
    const rankMap = new Map((rankRows ?? []).map((r) => [r.user_id as string, r.rank as LumenRank]));
    const pointsMap = new Map((rankRows ?? []).map((r) => [r.user_id as string, (r.points as number) ?? 0]));

    const now = Date.now();
    const ONLINE_MS = 2 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;

    const profileIds = new Set((profiles ?? []).map((p) => p.user_id as string));

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
        rank: rankMap.get(p.user_id as string) ?? "bronze",
        points: pointsMap.get(p.user_id as string) ?? 0,
      };
    });

    // Include auth users that never got a profile row, so every registered
    // account is visible in the console.
    for (const u of authList.users) {
      if (profileIds.has(u.id)) continue;
      accounts.push({
        user_id: u.id,
        display_name:
          (typeof u.user_metadata?.display_name === "string" ? u.user_metadata.display_name : "") ||
          (u.email ? u.email.split("@")[0]! : "(no profile)"),
        email: u.email ?? null,
        preferred_language: "en",
        created_at: u.created_at,
        last_seen_at: null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        is_admin: adminIds.has(u.id),
        suspension: suspensionMap.get(u.id) ?? null,
        rank: rankMap.get(u.id) ?? "bronze",
        points: pointsMap.get(u.id) ?? 0,
      });
    }
    accounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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