"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playTimerExpiryAlarm } from "@/lib/timer-expiry-alarm";

export type ConferenceTimerRow = {
  id: string;
  conference_id: string | null;
  current_speaker: string | null;
  next_speaker: string | null;
  time_left_seconds: number;
  total_time_seconds: number;
  vote_item_id?: string | null;
  per_speaker_mode?: boolean | null;
  /** When false, countdown is frozen until the chair starts again. */
  is_running?: boolean | null;
  /** Delegate-visible label (e.g. GSL 60s). */
  floor_label?: string | null;
  /** Shown when paused (e.g. after chair logs a pause reason). */
  current_pause_reason?: string | null;
};

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
 * @param activeVoteItemId Procedure current vote item when in voting_procedure; null otherwise.
 *        Timer rows with vote_item_id set are hidden unless they match or per_speaker_mode is on.
 * @param chairSeesRawTimer When true, ignore motion binding so chairs always see the committee timer row (for controls).
 */
export function useConferenceTimer(
  conferenceId: string | null,
  activeVoteItemId: string | null = null,
  chairSeesRawTimer = false
) {
  const [rawTimer, setRawTimer] = useState<ConferenceTimerRow | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const supabase = useMemo(() => createClient(), []);
  const prevRemainingRef = useRef<number | null>(null);
  const canExpireAlarmRef = useRef(false);

  const timer = useMemo(() => {
    if (!rawTimer) return null;
    if (chairSeesRawTimer) return rawTimer;
    return timerVisibleForFloor(rawTimer, activeVoteItemId) ? rawTimer : null;
  }, [rawTimer, activeVoteItemId, chairSeesRawTimer]);

  useEffect(() => {
    if (!conferenceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drop timer when no committee
      setRawTimer(null);
      return;
    }
    void supabase
      .from("timers")
      .select("*")
      .eq("conference_id", conferenceId)
      .maybeSingle()
      .then(({ data }) => {
        setElapsed(0);
        if (data) setRawTimer(data as ConferenceTimerRow);
        else setRawTimer(null);
      });
  }, [supabase, conferenceId]);

  useEffect(() => {
    if (!conferenceId) return;
    const channel = supabase
      .channel(`timers-hook-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timers",
          filter: `conference_id=eq.${conferenceId}`,
        },
        (payload) => {
          setRawTimer(payload.new as ConferenceTimerRow);
          setElapsed(0);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conferenceId]);

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
