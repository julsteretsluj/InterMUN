"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";

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
  theme = "dark",
  observeFloorOnly = false,
}: {
  conferenceId: string;
  theme?: "dark" | "light";
  /** Secretariat preview: do not load the signed-in user’s roll-call row. */
  observeFloorOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [activeVoteItemId, setActiveVoteItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("procedure_states")
        .select("state, current_vote_item_id")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as ProcedureRow | null;
      const id = row?.state === "voting_procedure" ? row.current_vote_item_id : null;
      setActiveVoteItemId(id ?? null);
    }

    void load();

    const ch = supabase
      .channel(`chair-live-floor-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${conferenceId}`,
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
  }, [supabase, conferenceId]);

  return (
    <div className="space-y-2">
      <FloorStatusBar
        conferenceId={conferenceId}
        theme={theme}
        observeOnly={observeFloorOnly}
        activeMotionVoteItemId={activeVoteItemId}
      />
    </div>
  );
}
