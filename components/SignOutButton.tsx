"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearRoomAndCommitteeContext } from "@/app/actions/roomGate";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
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
      className={cn(
        "text-sm text-brand-paper/80 hover:text-brand-gold-bright transition-colors underline-offset-2 hover:underline",
        className
      )}
    >
      Sign out
    </button>
  );
}
