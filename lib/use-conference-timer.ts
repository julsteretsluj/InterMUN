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
};

/** Live committee floor timer row (Supabase `timers` table). */
export function useConferenceTimer(conferenceId: string | null) {
  const [timer, setTimer] = useState<ConferenceTimerRow | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!conferenceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drop timer when no committee
      setTimer(null);
      return;
    }
    void supabase
      .from("timers")
      .select("*")
      .eq("conference_id", conferenceId)
      .maybeSingle()
      .then(({ data }) => {
        setElapsed(0);
        if (data) setTimer(data as ConferenceTimerRow);
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
          setTimer(payload.new as ConferenceTimerRow);
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
    const interval = setInterval(() => {
      setElapsed((e) => Math.min(e + 1, timer.total_time_seconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.time_left_seconds, timer?.total_time_seconds]);

  const remaining = timer ? Math.max(0, timer.time_left_seconds - elapsed) : 0;
  const total = timer?.total_time_seconds || 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return { timer, remaining, total, mins, secs };
}
