// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeAllocationsAcrossSiblingConferences } from "@/lib/conference-committee-canonical";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import {
  canRequestOrJoinSpeakerList,
  fetchDisciplineForAllocation,
} from "@/lib/delegate-discipline";
import { isSpeakerListEligibleAllocation } from "@/lib/speaker-list-eligibility";
import { upsertAlignedSpeakerTimer, type TimerSpeakerExisting } from "@/lib/timer-speakers";
import { notifySpeakerQueueUpdated } from "@/lib/speaker-queue-sync";
import { SPEAKER_QUEUE_LIST_KIND_OPENING } from "@/lib/speaker-queue";

export const OPENING_SPEECH_SECONDS = 60;
export const OPENING_SPEECH_EXTENDED_SECONDS = 90;
export const OPENING_SPEECH_FLOOR_LABEL = "Opening speeches";
export const OPENING_SPEECH_EXTENDED_FLOOR_LABEL = "Opening speeches (90s)";

export type OpeningSpeechAlloc = {
  id: string;
  country: string;
  userRole?: string | null;
  user_id?: string | null;
  conference_id?: string;
};

export function openingSpeechQueueLabel(country: string): string {
  const name = country.trim() || "—";
  const flag = flagEmojiForCountryName(name);
  return `${flag} ${name}`.trim();
}

/** Delegate seats only, sorted A→Z by country (case-insensitive). Same eligibility as Speakers. */
export function allocationsForOpeningSpeeches(
  allocations: OpeningSpeechAlloc[],
  isCrisisCommittee = false
): OpeningSpeechAlloc[] {
  return allocations
    .filter((a) => isSpeakerListEligibleAllocation(a, isCrisisCommittee))
    .sort((a, b) =>
      (a.country ?? "").trim().localeCompare((b.country ?? "").trim(), undefined, {
        sensitivity: "base",
      })
    );
}

async function loadRosterAllocationsForOpening(
  supabase: SupabaseClient,
  conferenceIds: string[],
  canonicalConferenceId: string
): Promise<OpeningSpeechAlloc[]> {
  const ids = Array.from(new Set(conferenceIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const { data: allocRows, error } = await supabase
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", ids)
    .order("country");
  if (error || !allocRows?.length) return [];

  const typed = allocRows as {
    id: string;
    country: string | null;
    user_id: string | null;
    conference_id: string;
  }[];
  const userIds = [
    ...new Set(typed.map((a) => a.user_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, role").in("id", userIds)
      : { data: [] as { id: string; role: string | null }[] };
  const roleById = new Map((profiles ?? []).map((p) => [p.id, p.role ?? null]));
  const withRoles = typed.map((a) => ({
    id: a.id,
    country: a.country ?? "",
    user_id: a.user_id,
    conference_id: a.conference_id,
    userRole: a.user_id ? roleById.get(a.user_id) ?? null : null,
  }));
  return mergeAllocationsAcrossSiblingConferences(withRoles, canonicalConferenceId);
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
 * Replace the opening-speeches list with every eligible delegation in alphabetical
 * order (does not touch the GSL / Speakers queue), and set a per-speaker floor
 * timer (default 60s, paused).
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
    /**
     * Roster scope (canonical + sibling topic rows). When the in-memory list is still
     * empty / all-dais, reload from these ids so opening matches the Speakers picker.
     */
    rosterConferenceIds?: string[];
    canonicalConferenceId?: string;
  }
): Promise<{ ok: true; count: number; skipped: number } | { ok: false; message: string }> {
  const speechSeconds = Math.max(
    1,
    Math.round(options?.speechSeconds ?? OPENING_SPEECH_SECONDS)
  );
  const isCrisis = options?.isCrisisCommittee ?? false;
  let eligible = allocationsForOpeningSpeeches(allocations, isCrisis);

  // Parent may call before session refresh finishes, or pass an empty prop briefly —
  // reload the same roster the Speakers list uses instead of falsely erroring.
  if (eligible.length === 0) {
    const rosterIds =
      options?.rosterConferenceIds?.length ? options.rosterConferenceIds : [conferenceId];
    const canonicalId = options?.canonicalConferenceId ?? conferenceId;
    const loaded = await loadRosterAllocationsForOpening(supabase, rosterIds, canonicalId);
    eligible = allocationsForOpeningSpeeches(loaded, isCrisis);
  }

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
    .eq("conference_id", conferenceId)
    .eq("list_kind", SPEAKER_QUEUE_LIST_KIND_OPENING);
  if (clearErr) return { ok: false, message: clearErr.message };

  const rows = allowed.map((alloc, index) => ({
    conference_id: conferenceId,
    allocation_id: alloc.id,
    label: openingSpeechQueueLabel(alloc.country),
    sort_order: index + 1,
    status: "waiting" as const,
    list_kind: SPEAKER_QUEUE_LIST_KIND_OPENING,
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

/**
 * Apply a passed motion to extend opening speech per-speaker time.
 * Defaults to 90s (SEAMUN standard); pass `targetSeconds` when the motion names a custom length.
 */
export async function applyOpeningSpeechTimeExtension(
  supabase: SupabaseClient,
  conferenceId: string,
  existing?: TimerSpeakerExisting | null,
  currentRemainingSeconds?: number | null,
  targetSeconds?: number | null
): Promise<{ ok: true; seconds: number } | { ok: false; message: string }> {
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

  const target = Math.max(
    OPENING_SPEECH_SECONDS,
    Math.round(targetSeconds && targetSeconds > 0 ? targetSeconds : OPENING_SPEECH_EXTENDED_SECONDS)
  );
  const previousTotal = Math.max(
    OPENING_SPEECH_SECONDS,
    Math.round(timerRow?.total_time_seconds ?? OPENING_SPEECH_SECONDS)
  );
  const remaining = Math.max(
    0,
    Math.round(
      currentRemainingSeconds ?? timerRow?.time_left_seconds ?? previousTotal
    )
  );
  const extension = Math.max(0, target - previousTotal);
  const nextLeft = Math.min(target, remaining + extension);
  const floorLabel =
    target >= OPENING_SPEECH_EXTENDED_SECONDS
      ? `Opening speeches (${target}s)`
      : OPENING_SPEECH_FLOOR_LABEL;

  const { error } = await upsertAlignedSpeakerTimer(supabase, conferenceId, {
    currentSpeaker: timerRow?.current_speaker ?? null,
    nextSpeaker: timerRow?.next_speaker ?? null,
    existing: timerRow,
    timeLeftSeconds: nextLeft,
    totalTimeSeconds: target,
    perSpeakerMode: true,
    isRunning: timerRow?.is_running ?? false,
    floorLabel,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, seconds: target };
}
