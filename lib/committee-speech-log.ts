// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append-only speech log used for per-delegate participation milestones.
 *
 * A speech is recorded when a delegate becomes the *current* speaker (they are
 * now delivering a speech). This is called from both chair advance flows
 * (manual "Current" and the per-speaker "advance" button). Failures are
 * swallowed — logging must never block the chair's session controls.
 */
export async function logCommitteeSpeech(
  supabase: SupabaseClient,
  args: {
    conferenceId: string;
    allocationId: string | null;
    speakerLabel: string | null;
  }
): Promise<void> {
  try {
    // Best-effort: capture the live procedure context if a vote item is open.
    let procedureCode: string | null = null;
    let voteItemId: string | null = null;
    const { data: ps } = await supabase
      .from("procedure_states")
      .select("current_vote_item_id")
      .eq("conference_id", args.conferenceId)
      .maybeSingle();
    if (ps?.current_vote_item_id) {
      voteItemId = ps.current_vote_item_id as string;
      const { data: vi } = await supabase
        .from("vote_items")
        .select("procedure_code")
        .eq("id", voteItemId)
        .maybeSingle();
      procedureCode = (vi?.procedure_code as string | null) ?? null;
    }

    await supabase.from("committee_speech_events").insert({
      conference_id: args.conferenceId,
      allocation_id: args.allocationId,
      speaker_label: args.speakerLabel,
      procedure_code: procedureCode,
      vote_item_id: voteItemId,
    });
  } catch {
    // Non-fatal.
  }
}
