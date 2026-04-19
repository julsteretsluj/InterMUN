import type { SupabaseClient } from "@supabase/supabase-js";
import { INTERMUN_ENTRY_ROLE_KEY, isInterMunEntryRole } from "@/lib/entry-role";

/**
 * Client-only: reads and clears `intermun.entryRole` from sessionStorage, then picks a dashboard
 * path consistent with the profile role when it matches the user’s onboarding choice.
 */
export async function resolveDashboardPathAfterAuth(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  let next = "/profile";
  const stored =
    typeof window !== "undefined" ? sessionStorage.getItem(INTERMUN_ENTRY_ROLE_KEY) : null;
  const entry = isInterMunEntryRole(stored) ? stored : null;
  if (typeof window !== "undefined") sessionStorage.removeItem(INTERMUN_ENTRY_ROLE_KEY);

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = prof?.role?.toString().trim().toLowerCase();
  if (role === "admin") next = "/admin";
  else if (role === "smt") next = "/smt";
  else if (role === "chair" && entry === "chair") next = "/chair";
  else if (role === "delegate" && entry === "delegate") next = "/delegate";
  return next;
}
