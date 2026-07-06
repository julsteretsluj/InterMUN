// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Supabase dashboard may label the key "publishable" or "anon".
 * Accept either so server/client/middleware all authenticate consistently.
 */
export function getSupabasePublishableKey(): string | undefined {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  return k?.trim() || undefined;
}
