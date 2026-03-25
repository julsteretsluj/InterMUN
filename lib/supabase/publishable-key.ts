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
