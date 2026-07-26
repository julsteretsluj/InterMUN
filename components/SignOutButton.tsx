// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

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
        "rounded-md px-2 py-1 text-sm text-brand-navy/80 underline-offset-2 transition-colors hover:bg-[var(--apple-bg-tertiary)] hover:text-brand-diplomatic hover:underline active:bg-slate-200 dark:hover:bg-white/5 dark:hover:text-brand-accent-bright dark:active:bg-white/10",
        className
      )}
    >
      Sign out
    </button>
  );
}
