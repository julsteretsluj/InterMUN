// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { INTERMUN_ENTRY_ROLE_KEY, isInterMunEntryRole } from "@/lib/entry-role";
import { ADVISOR_APP_HOME, SMT_APP_HOME } from "@/lib/roles";

/**
 * Client-only: reads and clears `intermun.entryRole` from sessionStorage, then routes to the
 * dashboard that matches the user's provisioned profile role (approved accounts). The entry
 * wheel is only a fallback for accounts that are not yet assigned a staff/advisor role or seat.
 */
export async function resolveDashboardPathAfterAuth(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const stored =
    typeof window !== "undefined" ? sessionStorage.getItem(INTERMUN_ENTRY_ROLE_KEY) : null;
  const entry = isInterMunEntryRole(stored) ? stored : null;
  if (typeof window !== "undefined") sessionStorage.removeItem(INTERMUN_ENTRY_ROLE_KEY);

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = prof?.role?.toString().trim().toLowerCase();

  if (role === "admin") return "/admin";
  if (role === "smt") return SMT_APP_HOME;
  if (role === "advisor") return ADVISOR_APP_HOME;
  if (role === "chair") return "/chair";

  if (role === "delegate") {
    const { count } = await supabase
      .from("allocations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const hasApprovedSeat = (count ?? 0) > 0;
    if (hasApprovedSeat || entry === "delegate") return "/delegate";
    return "/profile";
  }

  if (entry === "secretariat") return SMT_APP_HOME;
  if (entry === "chair") return "/chair";
  if (entry === "delegate") return "/delegate";
  if (entry === "advisor") return ADVISOR_APP_HOME;
  return "/profile";
}
