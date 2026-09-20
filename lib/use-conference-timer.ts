// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playTimerExpiryAlarm } from "@/lib/timer-expiry-alarm";
import {
  useSharedConferenceTimerRow,
  type ConferenceTimerRow,
} from "@/lib/hooks/useCommitteeLiveStore";

export type { ConferenceTimerRow };

/** Hide idle timer numbers on the live floor until something is actively happening. */
export function shouldShowLiveFloorTimerUI(
  timer: ConferenceTimerRow,
  isRunning: boolean
): boolean {
  if (isRunning) return true;
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

/**
 * Live committee floor timer (Supabase `timers` table).
 * Shares one realtime channel per conference via useCommitteeLiveStore.
 */
export function useConferenceTimer(
  conferenceId: string | null,
  activeVoteItemId: string | null = null,
  chairSeesRawTimer = false
) {
  const rawTimer = useSharedConferenceTimerRow(conferenceId);
  const [elapsed, setElapsed] = useState(0);
  const prevRemainingRef = useRef<number | null>(null);
  const canExpireAlarmRef = useRef(false);
  const timerIdentity = rawTimer
    ? `${rawTimer.id}:${rawTimer.time_left_seconds}:${rawTimer.is_running}:${rawTimer.total_time_seconds}`
    : "";

  useEffect(() => {
    setElapsed(0);
  }, [timerIdentity]);

  const timer = useMemo(() => {
    if (!rawTimer) return null;
    if (chairSeesRawTimer) return rawTimer;
    return timerVisibleForFloor(rawTimer, activeVoteItemId) ? rawTimer : null;
  }, [rawTimer, activeVoteItemId, chairSeesRawTimer]);

  useEffect(() => {
    if (!timer?.time_left_seconds) return;
    if (timer.is_running === false) return;
    const interval = setInterval(() => {
      setElapsed((e) => Math.min(e + 1, timer.total_time_seconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.time_left_seconds, timer?.total_time_seconds, timer?.is_running]);

  const remaining = timer ? Math.max(0, timer.time_left_seconds - elapsed) : 0;
  const total = timer?.total_time_seconds || 0;
  const perSpeakerMode = !!timer?.per_speaker_mode;
  const isRunning = timer ? timer.is_running !== false : false;
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
    if (
      isRunning &&
      remaining === 0 &&
      prev !== null &&
      prev > 0 &&
      canExpireAlarmRef.current
    ) {
      playTimerExpiryAlarm();
      canExpireAlarmRef.current = false;
    }
    prevRemainingRef.current = remaining;
  }, [timer, remaining, isRunning]);

  return { timer, remaining, total, mins, secs, perSpeakerMode, isRunning };
}
