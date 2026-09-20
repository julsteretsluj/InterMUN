// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { useLiveDebateConferenceId } from "@/lib/hooks/useLiveDebateConferenceId";
import { useSharedProcedureState } from "@/lib/hooks/useCommitteeLiveStore";

/**
 * Chair dashboard header: session + floor timer chips live in {@link FloorStatusBar}.
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
  const procedureLive = useSharedProcedureState(floorConferenceId);
  const activeVoteItemId =
    procedureLive?.state === "voting_procedure"
      ? procedureLive.current_vote_item_id ?? null
      : null;

  return (
    <div className="space-y-3">
      <FloorStatusBar
        conferenceId={floorConferenceId}
        sessionConferenceId={canonicalConferenceId}
        theme={theme}
        observeOnly={observeFloorOnly}
        activeMotionVoteItemId={activeVoteItemId}
        chairSeesRawTimer
      />
    </div>
  );
}
