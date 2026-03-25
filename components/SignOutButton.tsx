"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearRoomAndCommitteeContext } from "@/app/actions/roomGate";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await clearRoomAndCommitteeContext();
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
