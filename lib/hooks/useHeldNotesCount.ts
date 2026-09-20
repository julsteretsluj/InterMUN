// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side held-notes badge so the dashboard layout can skip that count query.
 * Refreshes on mount and when the tab becomes visible — no global realtime channel.
 */
export function useHeldNotesCount(siblingConferenceIds: string[] | null | undefined): number {
  const [count, setCount] = useState(0);
  const idsKey = (siblingConferenceIds ?? []).filter(Boolean).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setCount(0);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function refresh() {
      const { count: next } = await supabase
        .from("delegation_notes")
        .select("*", { count: "exact", head: true })
        .in("conference_id", ids)
        .eq("moderation_state", "held");
      if (!cancelled) setCount(next ?? 0);
    }

    void refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [idsKey]);

  return count;
}
