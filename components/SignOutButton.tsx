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
        "rounded-md px-2 py-1 text-sm text-brand-navy/80 underline-offset-2 transition-colors hover:bg-slate-100 hover:text-emerald-700 hover:underline active:bg-slate-200 dark:hover:bg-white/5 dark:hover:text-brand-gold-bright dark:active:bg-white/10",
        className
      )}
    >
      Sign out
    </button>
  );
}
