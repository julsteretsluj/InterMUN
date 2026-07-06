// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Email invites (Supabase auth.admin.inviteUserByEmail) need the service role key
 * on the server. Never expose this value to the browser.
 */
export function isAdminInviteConfigured(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(key && key.length > 10);
}
