import { createClient } from "@supabase/supabase-js";

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
      headers: { "X-Client-Info": "intermun-admin" },
    },
  });
}
