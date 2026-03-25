"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock } from "lucide-react";

interface Timer {
  id: string;
  conference_id: string | null;
  current_speaker: string | null;
  next_speaker: string | null;
  time_left_seconds: number;
  total_time_seconds: number;
}

export function Timers({ conferenceId }: { conferenceId: string | null }) {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!conferenceId) {
      setTimer(null);
      return;
    }
    void supabase
      .from("timers")
      .select("*")
      .eq("conference_id", conferenceId)
      .maybeSingle()
      .then(({ data }) => data && setTimer(data as Timer));
  }, [supabase, conferenceId]);

  useEffect(() => {
    if (!conferenceId) return;
    const channel = supabase
      .channel(`timers-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timers",
          filter: `conference_id=eq.${conferenceId}`,
        },
        (payload) => {
          setTimer(payload.new as Timer);
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

  const remaining = timer
    ? Math.max(0, timer.time_left_seconds - elapsed)
    : 0;
  const total = timer?.total_time_seconds || 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (!conferenceId || !timer) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-paper">
      <Clock className="w-5 h-5 text-brand-gold-bright shrink-0" />
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-xs uppercase tracking-wider text-brand-paper/55 block mb-0.5">
            Current speaker
          </span>
          <p className="font-medium">{timer.current_speaker || "—"}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-brand-paper/55 block mb-0.5">
            Next speaker
          </span>
          <p className="font-medium">{timer.next_speaker || "—"}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-brand-paper/55 block mb-0.5">
            Time left
          </span>
          <p className="font-mono font-medium tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")} / {Math.floor(total / 60)}:
            {(total % 60).toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}
