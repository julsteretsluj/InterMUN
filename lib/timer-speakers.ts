// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";

export type TimerSpeakerExisting = {
  vote_item_id?: string | null;
  floor_label?: string | null;
  time_left_seconds?: number | null;
  total_time_seconds?: number | null;
  is_running?: boolean | null;
  per_speaker_mode?: boolean | null;
};

/** Keep the floor timer's current/next speaker in lockstep with the speaker list. */
export async function upsertAlignedSpeakerTimer(
  supabase: SupabaseClient,
  conferenceId: string,
  input: {
    currentSpeaker: string | null;
    nextSpeaker: string | null;
    existing?: TimerSpeakerExisting | null;
    timeLeftSeconds?: number;
    totalTimeSeconds?: number;
    isRunning?: boolean;
    perSpeakerMode?: boolean;
    namesOnly?: boolean;
  }
) {
  if (input.namesOnly) {
    const { data: row } = await supabase
      .from("timers")
      .select("id")
      .eq("conference_id", conferenceId)
      .maybeSingle();
    if (row?.id) {
      return supabase
        .from("timers")
        .update({
          current_speaker: input.currentSpeaker,
          next_speaker: input.nextSpeaker,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", conferenceId);
    }
  }

  const total = Math.max(
    1,
    Math.round(
      input.totalTimeSeconds ?? input.existing?.total_time_seconds ?? 60
    )
  );
  let left = Math.round(
    input.timeLeftSeconds ?? input.existing?.time_left_seconds ?? total
  );
  if (left > total) left = total;
  if (left < 0) left = 0;

  const isRunning = input.isRunning ?? input.existing?.is_running ?? false;
  const payload: Record<string, unknown> = {
    conference_id: conferenceId,
    current_speaker: input.currentSpeaker,
    next_speaker: input.nextSpeaker,
    time_left_seconds: left,
    total_time_seconds: total,
    vote_item_id: input.existing?.vote_item_id ?? null,
    per_speaker_mode: input.perSpeakerMode ?? input.existing?.per_speaker_mode ?? true,
    is_running: isRunning,
    floor_label: input.existing?.floor_label ?? null,
    updated_at: new Date().toISOString(),
  };
  if (isRunning) payload.current_pause_reason = null;

  return supabase.from("timers").upsert(payload, { onConflict: "conference_id" });
}
