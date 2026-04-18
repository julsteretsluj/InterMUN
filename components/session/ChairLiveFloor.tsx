"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { useLiveDebateConferenceId } from "@/lib/hooks/useLiveDebateConferenceId";

type ProcedureRow = {
  state: string;
  current_vote_item_id: string | null;
};

/**
 * Chair dashboard header: single floor strip (motion + timer when voting, or general timer in debate).
 * Renders only inside {@link FloorStatusBar} so the timer is not duplicated.
 */
export function ChairLiveFloor({
  conferenceId,
  canonicalConferenceId,
  siblingConferenceIds,
  theme = "dark",
  observeFloorOnly = false,
}: {
  conferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  theme?: "dark" | "light";
  /** Secretariat preview: do not load the signed-in user’s roll-call row. */
  observeFloorOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const floorConferenceId = useLiveDebateConferenceId(
    supabase,
    conferenceId,
    canonicalConferenceId,
    siblingConferenceIds
  );
  const [activeVoteItemId, setActiveVoteItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("procedure_states")
        .select("state, current_vote_item_id")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as ProcedureRow | null;
      const id = row?.state === "voting_procedure" ? row.current_vote_item_id : null;
      setActiveVoteItemId(id ?? null);
    }

    void load();

    const ch = supabase
      .channel(`chair-live-floor-${floorConferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        (payload) => {
          const row = payload.new as ProcedureRow | null;
          if (!row) return;
          const id = row.state === "voting_procedure" ? row.current_vote_item_id : null;
          setActiveVoteItemId(id ?? null);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [supabase, floorConferenceId]);

  return (
    <div className="space-y-2">
      <FloorStatusBar
        conferenceId={floorConferenceId}
        theme={theme}
        observeOnly={observeFloorOnly}
        activeMotionVoteItemId={activeVoteItemId}
      />
    </div>
  );
}
