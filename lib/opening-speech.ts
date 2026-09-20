// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { DAIS_SEAT_CO_CHAIR, DAIS_SEAT_HEAD_CHAIR } from "@/lib/allocation-display-order";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import {
  canRequestOrJoinSpeakerList,
  fetchDisciplineForAllocation,
} from "@/lib/delegate-discipline";
import { upsertAlignedSpeakerTimer, type TimerSpeakerExisting } from "@/lib/timer-speakers";
import { notifySpeakerQueueUpdated } from "@/lib/speaker-queue-sync";

export const OPENING_SPEECH_SECONDS = 60;
export const OPENING_SPEECH_EXTENDED_SECONDS = 90;
export const OPENING_SPEECH_FLOOR_LABEL = "Opening speeches";
export const OPENING_SPEECH_EXTENDED_FLOOR_LABEL = "Opening speeches (90s)";

export type OpeningSpeechAlloc = {
  id: string;
  country: string;
  userRole?: string | null;
};

function isDaisOrChairSeat(alloc: OpeningSpeechAlloc, isCrisisCommittee: boolean): boolean {
  const label = alloc.country?.trim() ?? "";
  const key = label.toLowerCase();
  const isDaisSeat =
    key === DAIS_SEAT_HEAD_CHAIR.toLowerCase() ||
    key === DAIS_SEAT_CO_CHAIR.toLowerCase() ||
    key === "co chair";
  if (isDaisSeat) return true;
  const role = alloc.userRole?.toString().trim().toLowerCase();
  if (role === "chair" && !isCrisisCommittee) return true;
  return false;
}

export function openingSpeechQueueLabel(country: string): string {
  const name = country.trim() || "—";
  const flag = flagEmojiForCountryName(name);
  return `${flag} ${name}`.trim();
}

/** Delegate seats only, sorted A→Z by country (case-insensitive). */
export function allocationsForOpeningSpeeches(
  allocations: OpeningSpeechAlloc[],
  isCrisisCommittee = false
): OpeningSpeechAlloc[] {
  return allocations
    .filter((a) => !isDaisOrChairSeat(a, isCrisisCommittee))
    .sort((a, b) =>
      (a.country ?? "").trim().localeCompare((b.country ?? "").trim(), undefined, {
        sensitivity: "base",
      })
    );
}

export function isOpeningSpeechFloorLabel(label: string | null | undefined): boolean {
  const t = (label ?? "").trim().toLowerCase();
  return t.startsWith("opening speech");
}

export function openingSpeechSecondsFromFloorLabel(label: string | null | undefined): number {
  if ((label ?? "").includes("90")) return OPENING_SPEECH_EXTENDED_SECONDS;
  return OPENING_SPEECH_SECONDS;
}

/**
 * Replace the speaker queue with every eligible delegation in alphabetical order,
 * and set a per-speaker floor timer (default 60s, paused).
 */
export async function setupOpeningSpeeches(
  supabase: SupabaseClient,
  conferenceId: string,
  allocations: OpeningSpeechAlloc[],
  options?: {
    isCrisisCommittee?: boolean;
    speechSeconds?: number;
    existingTimer?: TimerSpeakerExisting | null;
    /** When true, mark the first speaker current (timer stays paused). */
    setFirstCurrent?: boolean;
  }
): Promise<{ ok: true; count: number; skipped: number } | { ok: false; message: string }> {
  const speechSeconds = Math.max(
    1,
    Math.round(options?.speechSeconds ?? OPENING_SPEECH_SECONDS)
  );
  const eligible = allocationsForOpeningSpeeches(
    allocations,
    options?.isCrisisCommittee ?? false
  );
  if (eligible.length === 0) {
    return { ok: false, message: "No delegate allocations are available for opening speeches." };
  }

  const allowed: OpeningSpeechAlloc[] = [];
  let skipped = 0;
  for (const alloc of eligible) {
    try {
      const discipline = await fetchDisciplineForAllocation(supabase, conferenceId, alloc.id);
      if (!canRequestOrJoinSpeakerList(discipline)) {
        skipped += 1;
        continue;
      }
    } catch {
      // If discipline lookup fails, still include the seat so chairs can run the list.
    }
    allowed.push(alloc);
  }

  if (allowed.length === 0) {
    return {
      ok: false,
      message: "Every delegation is blocked from the speaker list (discipline).",
    };
  }

  const { error: clearErr } = await supabase
    .from("speaker_queue_entries")
    .delete()
    .eq("conference_id", conferenceId);
  if (clearErr) return { ok: false, message: clearErr.message };

  const rows = allowed.map((alloc, index) => ({
    conference_id: conferenceId,
    allocation_id: alloc.id,
    label: openingSpeechQueueLabel(alloc.country),
    sort_order: index + 1,
    status: "waiting" as const,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from("speaker_queue_entries")
    .insert(rows)
    .select("id, allocation_id, label, sort_order")
    .order("sort_order", { ascending: true });
  if (insertErr) return { ok: false, message: insertErr.message };

  const ordered = (inserted ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  let currentSpeaker: string | null = null;
  let nextSpeaker: string | null = null;
  if (options?.setFirstCurrent !== false && ordered.length > 0) {
    const first = ordered[0]!;
    await supabase
      .from("speaker_queue_entries")
      .update({ status: "current" })
      .eq("id", first.id);
    currentSpeaker = first.label;
    nextSpeaker = ordered[1]?.label ?? null;
  } else {
    nextSpeaker = ordered[0]?.label ?? null;
  }

  const floorLabel =
    speechSeconds >= OPENING_SPEECH_EXTENDED_SECONDS
      ? OPENING_SPEECH_EXTENDED_FLOOR_LABEL
      : OPENING_SPEECH_FLOOR_LABEL;

  const { error: timerErr } = await upsertAlignedSpeakerTimer(supabase, conferenceId, {
    currentSpeaker,
    nextSpeaker,
    existing: options?.existingTimer,
    timeLeftSeconds: speechSeconds,
    totalTimeSeconds: speechSeconds,
    perSpeakerMode: true,
    isRunning: false,
    floorLabel,
  });
  if (timerErr) return { ok: false, message: timerErr.message };

  notifySpeakerQueueUpdated(conferenceId);
  return { ok: true, count: allowed.length, skipped };
}

/** Apply a passed motion to extend opening speech time from 60s → 90s. */
export async function applyOpeningSpeechTimeExtension(
  supabase: SupabaseClient,
  conferenceId: string,
  existing?: TimerSpeakerExisting | null,
  currentRemainingSeconds?: number | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  let timerRow = existing ?? null;
  if (!timerRow) {
    const { data } = await supabase
      .from("timers")
      .select(
        "vote_item_id, floor_label, time_left_seconds, total_time_seconds, is_running, per_speaker_mode, current_speaker, next_speaker"
      )
      .eq("conference_id", conferenceId)
      .maybeSingle();
    timerRow = (data as TimerSpeakerExisting | null) ?? null;
  }

  const remaining = Math.max(
    0,
    Math.round(
      currentRemainingSeconds ?? timerRow?.time_left_seconds ?? OPENING_SPEECH_SECONDS
    )
  );
  const extension = OPENING_SPEECH_EXTENDED_SECONDS - OPENING_SPEECH_SECONDS;
  const nextLeft = Math.min(OPENING_SPEECH_EXTENDED_SECONDS, remaining + extension);

  const { error } = await upsertAlignedSpeakerTimer(supabase, conferenceId, {
    currentSpeaker: timerRow?.current_speaker ?? null,
    nextSpeaker: timerRow?.next_speaker ?? null,
    existing: timerRow,
    timeLeftSeconds: nextLeft,
    totalTimeSeconds: OPENING_SPEECH_EXTENDED_SECONDS,
    perSpeakerMode: true,
    isRunning: timerRow?.is_running ?? false,
    floorLabel: OPENING_SPEECH_EXTENDED_FLOOR_LABEL,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
