// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useMemo, useRef } from "react";
import { playTimerExpiryAlarm } from "@/lib/timer-expiry-alarm";
import {
  useSharedConferenceTimerRow,
  useSharedConferenceTimerRunGeneration,
  type ConferenceTimerRow,
} from "@/lib/hooks/useCommitteeLiveStore";
import {
  isSpeakerTimerActivelyRunning,
  isSpeakerTimerUnconfigured,
  remainingSecondsFromTimerRow,
} from "@/lib/timer-speakers";
import { useNowMs } from "@/lib/hooks/useNowMs";

export type { ConferenceTimerRow };

/** Hide idle timer numbers on the live floor until something is actively happening. */
export function shouldShowLiveFloorTimerUI(
  timer: ConferenceTimerRow,
  isRunning: boolean
): boolean {
  // Seeded 0/0 rows are not a real clock — don't flash a live/running widget.
  if (isSpeakerTimerUnconfigured(timer)) return false;
  if (isRunning) return true;
  // Paused but still armed — keep the countdown chip visible (not only when a
  // pause reason / speaker name happens to be set).
  if (Math.round(timer.time_left_seconds ?? 0) > 0) return true;
  if (timer.current_pause_reason?.trim()) return true;
  if (timer.current_speaker?.trim()) return true;
  if (timer.next_speaker?.trim()) return true;
  return false;
}

function timerVisibleForFloor(
  row: ConferenceTimerRow,
  activeVoteItemId: string | null
): boolean {
  const bound = row.vote_item_id ?? null;
  const perSpeaker = !!row.per_speaker_mode;
  if (!bound && !perSpeaker) return true;
  if (perSpeaker) return true;
  if (activeVoteItemId && bound === activeVoteItemId) return true;
  return false;
}

type CountdownAnchor = {
  key: string;
  leftSeconds: number;
  atMs: number;
};

/**
 * Live committee floor timer (Supabase `timers` table).
 * Shares one realtime channel per conference via useCommitteeLiveStore.
 *
 * Prefer durable `countdown_ends_at` (survives remount/refetch). Fall back to a
 * client wall-clock anchor only for legacy rows that lack ends_at.
 */
export function useConferenceTimer(
  conferenceId: string | null,
  activeVoteItemId: string | null = null,
  chairSeesRawTimer = false
) {
  const rawTimer = useSharedConferenceTimerRow(conferenceId);
  const runGeneration = useSharedConferenceTimerRunGeneration(conferenceId);
  const prevRemainingRef = useRef<number | null>(null);
  const canExpireAlarmRef = useRef(false);
  const anchorRef = useRef<CountdownAnchor | null>(null);

  const timer = useMemo(() => {
    if (!rawTimer) return null;
    if (chairSeesRawTimer) return rawTimer;
    return timerVisibleForFloor(rawTimer, activeVoteItemId) ? rawTimer : null;
  }, [rawTimer, activeVoteItemId, chairSeesRawTimer]);

  const dbRunning = isSpeakerTimerActivelyRunning(timer);
  const leftSeconds = Math.max(0, Math.round(timer?.time_left_seconds ?? 0));
  const total = Math.max(0, Math.round(timer?.total_time_seconds ?? 0));
  const endsAtMs = timer?.countdown_ends_at
    ? Date.parse(timer.countdown_ends_at)
    : NaN;
  const hasEndsAt = Number.isFinite(endsAtMs);
  // Include runGeneration so legacy (no ends_at) Start can re-anchor after a spent UI countdown.
  const timerIdentity = timer
    ? `${timer.id}:${leftSeconds}:${dbRunning ? 1 : 0}:${total}:${runGeneration}:${timer.countdown_ends_at ?? ""}`
    : "";

  const nowMs = useNowMs(Boolean(timer && dbRunning && (hasEndsAt || leftSeconds > 0)));
  // Guard against a stale shared tick (e.g. after all subscribers unmounted):
  // anchoring on an old nowMs makes remaining collapse to 0 on the next emit.
  const wallNow = Date.now();
  const tickNow =
    nowMs > 0 && wallNow - nowMs < 2000 ? nowMs : wallNow;

  let remaining = 0;
  if (!timer) {
    remaining = 0;
    anchorRef.current = null;
  } else if (!dbRunning) {
    remaining = leftSeconds;
    anchorRef.current = null;
  } else if (hasEndsAt) {
    remaining = remainingSecondsFromTimerRow(timer, tickNow);
    anchorRef.current = null;
  } else {
    // Legacy path: DB has is_running but no countdown_ends_at yet.
    if (leftSeconds <= 0) {
      anchorRef.current = null;
      remaining = 0;
    } else {
      if (!anchorRef.current || anchorRef.current.key !== timerIdentity) {
        anchorRef.current = {
          key: timerIdentity,
          leftSeconds,
          atMs: tickNow,
        };
      }
      remaining = Math.max(
        0,
        (anchorRef.current?.leftSeconds ?? leftSeconds) -
          Math.floor((tickNow - (anchorRef.current?.atMs ?? tickNow)) / 1000)
      );
      // Spent legacy countdown: pin zero until Start bumps runGeneration / ends_at.
      if (
        remaining <= 0 &&
        anchorRef.current?.key === timerIdentity &&
        anchorRef.current.leftSeconds !== 0
      ) {
        anchorRef.current = {
          key: timerIdentity,
          leftSeconds: 0,
          atMs: tickNow,
        };
        remaining = 0;
      }
    }
  }

  // UI "running" requires visible time left — spent countdowns must enable Start again.
  const isRunning = dbRunning && remaining > 0;
  const perSpeakerMode = !!timer?.per_speaker_mode;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  useEffect(() => {
    if (!timer) {
      prevRemainingRef.current = null;
      canExpireAlarmRef.current = false;
      return;
    }
    if (remaining > 0) {
      canExpireAlarmRef.current = true;
    }
    const prev = prevRemainingRef.current;
    // Use dbRunning: UI isRunning is false once remaining hits 0.
    if (
      dbRunning &&
      remaining === 0 &&
      prev !== null &&
      prev > 0 &&
      canExpireAlarmRef.current
    ) {
      playTimerExpiryAlarm();
      canExpireAlarmRef.current = false;
    }
    prevRemainingRef.current = remaining;
  }, [timer, remaining, dbRunning]);

  return { timer, remaining, total, mins, secs, perSpeakerMode, isRunning };
}
