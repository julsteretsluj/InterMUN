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

type TimerTheme = "dark" | "light";

export function Timers({
  conferenceId,
  theme = "dark",
}: {
  conferenceId: string | null;
  theme?: TimerTheme;
}) {
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

  if (!conferenceId) return null;

  const isLight = theme === "light";
  const shell = isLight
    ? "flex flex-wrap items-center gap-4 px-3 py-2.5 rounded-lg bg-white border border-brand-navy/10 text-brand-navy text-sm"
    : "flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-white/8 border border-white/12 text-brand-paper/95";
  const labelCls = isLight
    ? "text-xs uppercase tracking-wider text-brand-muted block mb-0.5"
    : "text-xs uppercase tracking-wider text-brand-paper/75 block mb-0.5";
  const clockCls = isLight ? "w-4 h-4 text-brand-gold shrink-0" : "w-5 h-5 text-brand-gold-bright shrink-0";

  if (!timer) {
    return isLight ? (
      <p className="text-xs text-brand-muted italic px-1">No timer row yet for this committee.</p>
    ) : null;
  }

  return (
    <div className={shell}>
      <Clock className={clockCls} />
      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
        <div>
          <span className={labelCls}>Current speaker</span>
          <p className="font-medium">{timer.current_speaker || "—"}</p>
        </div>
        <div>
          <span className={labelCls}>Next speaker</span>
          <p className="font-medium">{timer.next_speaker || "—"}</p>
        </div>
        <div>
          <span className={labelCls}>Time left</span>
          <p className="font-mono font-medium tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")} / {Math.floor(total / 60)}:
            {(total % 60).toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}
