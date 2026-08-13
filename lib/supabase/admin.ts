// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { createClient } from "@supabase/supabase-js";
import { timedSupabaseFetch } from "./timed-fetch";

/** Service-role client: server-only. Used for invite-by-email. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: timedSupabaseFetch,
      headers: { "X-Client-Info": "intermun-admin" },
    },
  });
}
