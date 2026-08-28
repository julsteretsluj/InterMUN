// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentAndNextQueueRows } from "@/lib/speaker-queue";

/** Live current/next labels from the speaker list (allocation country when linked). */
export function useSpeakerQueueLabels(conferenceId: string | null) {
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [nextLabel, setNextLabel] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!conferenceId) {
      setCurrentLabel(null);
      setNextLabel(null);
      return Promise.resolve();
    }
    const supabase = createClient();
    return supabase
      .from("speaker_queue_entries")
      .select("id, label, status, allocation_id, sort_order")
      .eq("conference_id", conferenceId)
      .in("status", ["current", "waiting"])
      .order("sort_order", { ascending: true })
      .then(async ({ data }) => {
        const rows =
          (data as {
            id: string;
            label: string | null;
            status: string;
            allocation_id: string | null;
            sort_order: number;
          }[]) ?? [];
        const { current, next } = currentAndNextQueueRows(rows);
        const allocIds = [...new Set([current?.allocation_id, next?.allocation_id].filter(Boolean))] as string[];
        const countryById = new Map<string, string>();
        if (allocIds.length > 0) {
          const { data: allocs } = await supabase.from("allocations").select("id, country").in("id", allocIds);
          for (const a of allocs ?? []) {
            const country = String((a as { country?: string | null }).country ?? "").trim();
            if (country) countryById.set((a as { id: string }).id, country);
          }
        }
        const labelFor = (row: { allocation_id: string | null; label: string | null } | null) => {
          if (!row) return null;
          const stored = row.label?.trim();
          if (stored) return stored;
          const fromAlloc = row.allocation_id ? countryById.get(row.allocation_id) : null;
          return fromAlloc || null;
        };
        setCurrentLabel(labelFor(current));
        setNextLabel(labelFor(next));
      });
  }, [conferenceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!conferenceId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`speaker-queue-labels-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "speaker_queue_entries",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conferenceId, load]);

  return { currentLabel, nextLabel };
}
