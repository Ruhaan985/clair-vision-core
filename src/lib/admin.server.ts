export async function assertLumenAdmin(context: { userId: string; claims: Record<string, unknown> }) {
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