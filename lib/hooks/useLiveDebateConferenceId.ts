"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";

/**
 * Keeps floor `conference_id` in sync when chairs change `committee_synced_state.active_debate_topic`.
 */
export function useLiveDebateConferenceId(
  supabase: SupabaseClient,
  initialDebateConferenceId: string,
  canonicalConferenceId: string,
  siblingConferenceIds: string[]
): string {
  const [id, setId] = useState(initialDebateConferenceId);
  const siblingKey = siblingConferenceIds.slice().sort().join(",");

  useEffect(() => {
    setId(initialDebateConferenceId);
  }, [initialDebateConferenceId]);

  useEffect(() => {
    if (siblingConferenceIds.length <= 1) return;

    const siblingSet = new Set(siblingConferenceIds);

    const ch = supabase
      .channel(`active-debate-topic-${canonicalConferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "committee_synced_state",
          filter: `conference_id=eq.${canonicalConferenceId}`,
        },
        (payload) => {
          const row = payload.new as { state_key?: string; payload?: { topic_conference_id?: string } } | null;
          if (!row || row.state_key !== COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC) return;
          const next = row.payload?.topic_conference_id;
          if (typeof next === "string" && siblingSet.has(next)) setId(next);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, canonicalConferenceId, siblingKey, siblingConferenceIds]);

  return id;
}
