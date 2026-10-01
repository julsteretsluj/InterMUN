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
  current_speaker?: string | null;
  next_speaker?: string | null;
};

export const DEFAULT_SPEAKER_TIMER_SECONDS = 60;

/** True when there is no usable per-speaker / floor clock yet (missing row or 0/0 seed). */
export function isSpeakerTimerUnconfigured(
  timer: Pick<TimerSpeakerExisting, "total_time_seconds" | "time_left_seconds"> | null | undefined
): boolean {
  if (!timer) return true;
  const total = Math.round(timer.total_time_seconds ?? 0);
  const left = Math.round(timer.time_left_seconds ?? 0);
  return total <= 0 && left <= 0;
}

/** Prefer an existing cap; otherwise fall back to opening-speech / GSL default (60s). */
export function resolveSpeakerTimerSeconds(
  timer: TimerSpeakerExisting | null | undefined,
  fallbackSeconds: number = DEFAULT_SPEAKER_TIMER_SECONDS
): number {
  const total = Math.round(timer?.total_time_seconds ?? 0);
  const left = Math.round(timer?.time_left_seconds ?? 0);
  if (total > 0) return total;
  if (left > 0) return left;
  return Math.max(1, Math.round(fallbackSeconds));
}

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
    /** When set, updates `floor_label` (pass `null` to clear). */
    floorLabel?: string | null;
    /** Keep existing current/next speaker names instead of overwriting. */
    preserveSpeakers?: boolean;
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
    // No timer row yet — names-only sync must not invent a paused clock.
    // Start / advance / opening-speech setup create the row intentionally.
    return { data: null, error: null };
  }

  const existingTotal =
    input.existing && !isSpeakerTimerUnconfigured(input.existing)
      ? Math.round(input.existing.total_time_seconds ?? 0)
      : 0;
  const existingLeft =
    input.existing && !isSpeakerTimerUnconfigured(input.existing)
      ? Math.round(input.existing.time_left_seconds ?? 0)
      : 0;
  const total = Math.max(
    1,
    Math.round(input.totalTimeSeconds ?? (existingTotal > 0 ? existingTotal : DEFAULT_SPEAKER_TIMER_SECONDS))
  );
  let left = Math.round(
    input.timeLeftSeconds ?? (existingLeft > 0 ? existingLeft : total)
  );
  if (left > total) left = total;
  if (left < 0) left = 0;

  const isRunning = input.isRunning ?? input.existing?.is_running ?? false;
  const currentSpeaker = input.preserveSpeakers
    ? (input.existing?.current_speaker ?? input.currentSpeaker)
    : input.currentSpeaker;
  const nextSpeaker = input.preserveSpeakers
    ? (input.existing?.next_speaker ?? input.nextSpeaker)
    : input.nextSpeaker;
  const floorLabel =
    input.floorLabel !== undefined
      ? input.floorLabel?.trim() || null
      : input.existing?.floor_label ?? null;
  const payload: Record<string, unknown> = {
    conference_id: conferenceId,
    current_speaker: currentSpeaker,
    next_speaker: nextSpeaker,
    time_left_seconds: left,
    total_time_seconds: total,
    vote_item_id: input.existing?.vote_item_id ?? null,
    per_speaker_mode: input.perSpeakerMode ?? input.existing?.per_speaker_mode ?? true,
    is_running: isRunning,
    floor_label: floorLabel,
    updated_at: new Date().toISOString(),
  };
  if (isRunning) payload.current_pause_reason = null;

  const upserted = await supabase
    .from("timers")
    .upsert(payload, { onConflict: "conference_id" });
  if (!upserted.error) return upserted;

  // Sibling topic rows (and some older committees) may lack a timers seed row;
  // fall back to plain insert, then update, so Speakers Start still works.
  const inserted = await supabase.from("timers").insert(payload);
  if (!inserted.error) return inserted;

  const { conference_id: _omit, ...updateFields } = payload;
  return supabase.from("timers").update(updateFields).eq("conference_id", conferenceId);
}
