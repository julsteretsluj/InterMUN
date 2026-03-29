"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, Gavel } from "lucide-react";
import { useConferenceTimer } from "@/lib/use-conference-timer";
import { formatVoteMajorityLabel } from "@/lib/format-vote-majority";

type VoteMotionRow = {
  id: string;
  title: string | null;
  description: string | null;
  required_majority: string;
  vote_type: string;
  motioner_allocation_id: string | null;
};

export function ActiveMotionContextStrip({
  conferenceId,
  voteItemId,
  theme = "dark",
}: {
  conferenceId: string;
  voteItemId: string;
  theme?: "dark" | "light";
}) {
  const supabase = useMemo(() => createClient(), []);
  const { timer, total, mins, secs, perSpeakerMode, isRunning } = useConferenceTimer(
    conferenceId,
    voteItemId
  );
  const [row, setRow] = useState<VoteMotionRow | null>(null);
  const [motionerCountry, setMotionerCountry] = useState<string | null>(null);

  const loadMotion = useCallback(async () => {
    const { data: vi } = await supabase
      .from("vote_items")
      .select("id, title, description, required_majority, vote_type, motioner_allocation_id")
      .eq("id", voteItemId)
      .maybeSingle();

    const typed = vi as VoteMotionRow | null;
    setRow(typed);

    if (typed?.motioner_allocation_id) {
      const { data: alloc } = await supabase
        .from("allocations")
        .select("country")
        .eq("id", typed.motioner_allocation_id)
        .maybeSingle();
      setMotionerCountry(alloc?.country?.trim() || null);
    } else {
      setMotionerCountry(null);
    }
  }, [supabase, voteItemId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate motion row for current vote item
    void loadMotion();
  }, [loadMotion]);

  useEffect(() => {
    const ch = supabase
      .channel(`active-motion-${voteItemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_items",
          filter: `id=eq.${voteItemId}`,
        },
        () => void loadMotion()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, voteItemId, loadMotion]);

  const isLight = theme === "light";
  const shell = isLight
    ? "rounded-lg border border-brand-navy/10 bg-black/25 text-brand-navy text-sm p-3 space-y-3 shadow-sm"
    : "rounded-xl border border-white/12 bg-black/20 text-brand-navy/95 text-sm p-3 md:p-4 space-y-3";
  const labelCls = isLight
    ? "text-[0.65rem] uppercase tracking-wider text-brand-muted block mb-0.5"
    : "text-[0.65rem] uppercase tracking-wider text-brand-navy/75 block mb-0.5";
  const bodyCls = isLight ? "font-medium text-brand-navy" : "font-medium text-brand-navy/95";
  const subCls = isLight ? "text-sm text-brand-navy/85 mt-1 line-clamp-4" : "text-sm text-brand-navy/90 mt-1 line-clamp-4";
  const iconCls = isLight ? "w-4 h-4 text-brand-gold shrink-0 mt-0.5" : "w-5 h-5 text-brand-gold-bright shrink-0 mt-0.5";
  const divider = isLight ? "border-t border-brand-navy/10 pt-3" : "border-t border-white/10 pt-3";
  const clockCls = isLight ? "w-4 h-4 text-brand-gold shrink-0" : "w-5 h-5 text-brand-gold-bright shrink-0";
  const timerLabel = isLight
    ? "text-xs uppercase tracking-wider text-brand-muted block mb-0.5"
    : "text-xs uppercase tracking-wider text-brand-navy/75 block mb-0.5";

  return (
    <div className={shell}>
      <div className="flex gap-3 items-start">
        <Gavel className={iconCls} aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <span className={labelCls}>Current motion</span>
            <p className={`${bodyCls} text-base`}>{row?.title?.trim() || "Motion"}</p>
            {row?.description?.trim() ? (
              <p className={subCls}>{row.description.trim()}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <span className={labelCls}>Motioner</span>
              <p className={bodyCls}>{motionerCountry || "—"}</p>
            </div>
            <div>
              <span className={labelCls}>Majority</span>
              <p className={bodyCls}>{row ? formatVoteMajorityLabel(row.required_majority) : "—"}</p>
            </div>
            <div>
              <span className={labelCls}>Type</span>
              <p className={`${bodyCls} capitalize`}>{row?.vote_type || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={divider}>
        {timer ? (
          <div className="flex flex-wrap items-center gap-4">
            <Clock className={clockCls} />
            <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
              {timer.floor_label?.trim() ? (
                <div>
                  <span className={timerLabel}>Timer</span>
                  <p className="font-semibold text-brand-gold">{timer.floor_label.trim()}</p>
                </div>
              ) : null}
              <div>
                <span className={timerLabel}>Current speaker</span>
                <p className="font-medium">{timer.current_speaker || "—"}</p>
              </div>
              <div>
                <span className={timerLabel}>Next speaker</span>
                <p className="font-medium">{timer.next_speaker || "—"}</p>
              </div>
              <div>
                <span className={timerLabel}>{perSpeakerMode ? "Speaker time left" : "Time left"}</span>
                <p className="font-mono font-medium tabular-nums">
                  {mins}:{secs.toString().padStart(2, "0")} / {Math.floor(total / 60)}:
                  {(total % 60).toString().padStart(2, "0")}
                  {perSpeakerMode ? (
                    <span className="ml-1 font-sans text-[0.65rem] font-normal normal-case opacity-80">
                      (per speaker)
                    </span>
                  ) : null}
                  {!isRunning ? (
                    <span className="ml-1 font-sans text-[0.65rem] font-normal normal-case text-amber-700 dark:text-amber-300">
                      (paused)
                    </span>
                  ) : null}
                </p>
                {!isRunning && timer.current_pause_reason?.trim() ? (
                  <p className="mt-1 max-w-md text-[0.7rem] font-normal normal-case opacity-90">
                    Pause: {timer.current_pause_reason.trim()}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : isLight ? (
          <p className="text-xs text-brand-muted italic">No timer row yet for this committee.</p>
        ) : null}
      </div>
    </div>
  );
}
