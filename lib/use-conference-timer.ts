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
 * Countdown uses the shared wall-clock store (same pattern as session elapsed)
 * so status-bar widgets keep ticking even when DB `time_left_seconds` is frozen
 * until Pause/Save.
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
  // Include runGeneration so Start can re-anchor after the UI countdown hit 0 while
  // DB still has the same is_running + time_left (identity would otherwise be stable).
  const timerIdentity = timer
    ? `${timer.id}:${leftSeconds}:${dbRunning ? 1 : 0}:${total}:${runGeneration}`
    : "";

  // Tick only while a configured clock is running; paused clocks stay frozen.
  const nowMs = useNowMs(Boolean(timer && dbRunning && leftSeconds > 0));
  // Guard against a stale shared tick (e.g. after all subscribers unmounted):
  // anchoring on an old nowMs makes remaining collapse to 0 on the next emit.
  const wallNow = Date.now();
  const tickNow =
    nowMs > 0 && wallNow - nowMs < 2000 ? nowMs : wallNow;

  if (!timer || !dbRunning || leftSeconds <= 0) {
    anchorRef.current = null;
  } else if (!anchorRef.current || anchorRef.current.key !== timerIdentity) {
    anchorRef.current = {
      key: timerIdentity,
      leftSeconds,
      atMs: tickNow,
    };
  }

  const remaining = !timer
    ? 0
    : !dbRunning || leftSeconds <= 0
      ? leftSeconds
      : Math.max(
          0,
          (anchorRef.current?.leftSeconds ?? leftSeconds) -
            Math.floor((tickNow - (anchorRef.current?.atMs ?? tickNow)) / 1000)
        );

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
