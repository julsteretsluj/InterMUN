// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type DashboardAuthProfile = {
  role: string | null;
  name: string | null;
  profile_picture_url: string | null;
};

/**
 * Request-scoped auth + profile for the dashboard shell.
 * Dedupes getUser (and the default profile select) when layout and pages both need them.
 */
export const getCachedDashboardAuth = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
  profile: DashboardAuthProfile | null;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, profile_picture_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: profile
      ? {
          role: profile.role ?? null,
          name: profile.name ?? null,
          profile_picture_url: profile.profile_picture_url ?? null,
        }
      : null,
  };
});

/** Request-scoped getUser only — shares work with {@link getCachedDashboardAuth} when both run. */
export const getCachedAuthUser = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
}> => {
  const auth = await getCachedDashboardAuth();
  return { supabase: auth.supabase, user: auth.user };
});
