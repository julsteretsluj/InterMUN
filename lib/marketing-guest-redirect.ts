// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, isSmtRole, SMT_APP_HOME, ADMIN_APP_HOME } from "@/lib/roles";

/** Logged-in users skip public marketing pages. */
export async function redirectMarketingGuestsToApp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isAdminRole(profile?.role)) redirect(ADMIN_APP_HOME);
  redirect(isSmtRole(profile?.role) ? SMT_APP_HOME : "/profile");
}
