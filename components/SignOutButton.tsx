"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearCommitteeVerification } from "@/app/actions/committeeGate";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await clearCommitteeVerification();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="text-sm text-brand-paper/80 hover:text-brand-gold-bright transition-colors underline-offset-2 hover:underline"
    >
      Sign out
    </button>
  );
}
