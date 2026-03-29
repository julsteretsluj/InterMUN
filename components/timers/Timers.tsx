"use client";

import { Clock } from "lucide-react";
import { useConferenceTimer } from "@/lib/use-conference-timer";

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
  const { timer, total, mins, secs, perSpeakerMode } = useConferenceTimer(conferenceId, activeVoteItemId);

  if (!conferenceId) return null;

  const isLight = theme === "light";
  const shell = isLight
    ? "flex flex-wrap items-center gap-4 px-3 py-2.5 rounded-lg bg-black/25 border border-brand-navy/10 text-brand-navy text-sm"
    : "flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-black/20 border border-white/12 text-brand-navy/95";
  const labelCls = isLight
    ? "text-xs uppercase tracking-wider text-brand-muted block mb-0.5"
    : "text-xs uppercase tracking-wider text-brand-navy/75 block mb-0.5";
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
          <span className={labelCls}>{perSpeakerMode ? "Speaker time left" : "Time left"}</span>
          <p className="font-mono font-medium tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")} / {Math.floor(total / 60)}:
            {(total % 60).toString().padStart(2, "0")}
            {perSpeakerMode ? (
              <span className="ml-1 font-sans text-[0.65rem] font-normal normal-case text-brand-muted">
                (per speaker)
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
