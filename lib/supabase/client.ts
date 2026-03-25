import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey } from "./publishable-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = getSupabasePublishableKey();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a publishable/anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)."
    );
  }
  return createBrowserClient(url, anonKey);
}
