"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock } from "lucide-react";

interface Timer {
  id: string;
  current_speaker: string | null;
  next_speaker: string | null;
  time_left_seconds: number;
  total_time_seconds: number;
}

export function Timers() {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("timers")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => data && setTimer(data));
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("timers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timers" },
        (payload) => {
          setTimer(payload.new as Timer);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [supabase]);

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

  if (!timer) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <Clock className="w-5 h-5 text-slate-500" />
      <div className="flex gap-6">
        <div>
          <span className="text-xs text-slate-500">Current speaker</span>
          <p className="font-medium">{timer.current_speaker || "—"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Next speaker</span>
          <p className="font-medium">{timer.next_speaker || "—"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Time left</span>
          <p className="font-mono font-medium">
            {mins}:{secs.toString().padStart(2, "0")} / {Math.floor(total / 60)}:
            {(total % 60).toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}
