// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { COMMITTEE_SESSION_UPDATED_EVENT } from "@/lib/committee-session-sync";

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

    let cancelled = false;
    const siblingSet = new Set(siblingConferenceIds);

    async function pullLiveTopic() {
      const { data } = await supabase
        .from("committee_synced_state")
        .select("payload")
        .eq("conference_id", canonicalConferenceId)
        .eq("state_key", COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC)
        .maybeSingle();
      const next = (data as { payload?: { topic_conference_id?: string } } | null)?.payload
        ?.topic_conference_id;
      if (!cancelled && typeof next === "string" && siblingSet.has(next)) setId(next);
    }

    void pullLiveTopic();

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

    function onSessionUpdated(event: Event) {
      const detail = (event as CustomEvent<{ conferenceId?: string }>).detail;
      const id = detail?.conferenceId;
      if (id && id !== canonicalConferenceId && !siblingSet.has(id)) return;
      void pullLiveTopic();
    }
    window.addEventListener(COMMITTEE_SESSION_UPDATED_EVENT, onSessionUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(COMMITTEE_SESSION_UPDATED_EVENT, onSessionUpdated);
      void supabase.removeChannel(ch);
    };
  }, [supabase, canonicalConferenceId, siblingKey, siblingConferenceIds, initialDebateConferenceId]);

  return id;
}
