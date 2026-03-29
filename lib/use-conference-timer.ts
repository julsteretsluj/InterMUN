"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
};

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

  return { timer, remaining, total, mins, secs, perSpeakerMode, isRunning };
}
