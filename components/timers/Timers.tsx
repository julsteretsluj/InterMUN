"use client";

import { Clock } from "lucide-react";
import { shouldShowLiveFloorTimerUI, useConferenceTimer } from "@/lib/use-conference-timer";

type TimerTheme = "dark" | "light";

export function Timers({
  conferenceId,
  theme = "dark",
  activeVoteItemId = null,
}: {
  conferenceId: string | null;
  theme?: TimerTheme;
  /** Current open motion id when in voting procedure; used to show motion-bound timers only. */
  activeVoteItemId?: string | null;
}) {
  const { timer, total, mins, secs, perSpeakerMode, isRunning } = useConferenceTimer(
    conferenceId,
    activeVoteItemId
  );

  if (!conferenceId) return null;

  const isLight = theme === "light";
  const shell = isLight
    ? "flex flex-wrap items-center gap-4 px-3 py-2.5 rounded-lg bg-black/25 border border-brand-navy/10 text-brand-navy text-sm"
    : "flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-black/20 border border-white/12 text-brand-navy/95";
  const labelCls = isLight
    ? "text-xs uppercase tracking-wider text-brand-muted block mb-0.5"
    : "text-xs uppercase tracking-wider text-brand-navy/75 block mb-0.5";
  const clockCls = isLight ? "w-4 h-4 text-brand-gold shrink-0" : "w-5 h-5 text-brand-gold-bright shrink-0";

  if (!timer) return null;

  if (!shouldShowLiveFloorTimerUI(timer, isRunning)) return null;

  const floorLabel = timer.floor_label?.trim();
  const pauseReason = timer.current_pause_reason?.trim();

  return (
    <div className={shell}>
      <Clock className={clockCls} />
      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
        {floorLabel ? (
          <div className="min-w-[8rem]">
            <span className={labelCls}>Timer</span>
            <p className="font-semibold text-brand-gold">{floorLabel}</p>
          </div>
        ) : null}
        <div>
          <span className={labelCls}>Current speaker</span>
          <p className="font-medium">{timer.current_speaker || "—"}</p>
        </div>
        <div>
          <span className={labelCls}>Next speaker</span>
          <p className="font-medium">{timer.next_speaker || "—"}</p>
        </div>
        <div>
          <span className={labelCls}>
            {perSpeakerMode ? "Speaker time (left / cap)" : "Speaker time (left / total)"}
          </span>
          <p className="font-mono font-medium tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")} / {Math.floor(total / 60)}:
            {(total % 60).toString().padStart(2, "0")}
            {perSpeakerMode ? (
              <span className="ml-1 font-sans text-[0.65rem] font-normal normal-case text-brand-muted">
                (per speaker)
              </span>
            ) : null}
            {!isRunning ? (
              <span className="ml-1 font-sans text-[0.65rem] font-normal normal-case text-amber-700 dark:text-amber-400">
                (paused)
              </span>
            ) : null}
          </p>
          {!isRunning && pauseReason ? (
            <p className="mt-1 max-w-md text-[0.7rem] font-normal normal-case text-amber-900/90 dark:text-amber-200/90">
              Pause: {pauseReason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
