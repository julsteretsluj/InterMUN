// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Pause, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETING_SESSION_SURFACE, MARKETING_CHAMBER_PREVIEW, MARKETING_SESSION_INSET, SESSION_FLOOR_LABEL } from "./marketing-preview-styles";

export type SpeakerQueueDemoRow = {
  id: string;
  country: string;
  status: "current" | "waiting";
};

const DEFAULT_QUEUE: SpeakerQueueDemoRow[] = [
  { id: "norway", country: "Norway", status: "current" },
  { id: "spain", country: "Spain", status: "waiting" },
  { id: "italy", country: "Italy", status: "waiting" },
  { id: "kenya", country: "Kenya", status: "waiting" },
  { id: "mexico", country: "Mexico", status: "waiting" },
];

function formatTimer(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MarketingSessionSpeakersPanel({
  className,
  compactIntro = false,
  heroCompact = false,
}: {
  className?: string;
  /** Hide the long intro when stacked under roll call on the hero preview. */
  compactIntro?: boolean;
  /** Tighter hero chamber demo — shorter queue and controls. */
  heroCompact?: boolean;
}) {
  const tq = useTranslations("chairSpeakerQueuePanel");
  const tTimer = useTranslations("session.timerPage");
  const [queue, setQueue] = useState<SpeakerQueueDemoRow[]>(DEFAULT_QUEUE);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [running, setRunning] = useState(false);

  const sorted = queue;
  const current = queue.find((row) => row.status === "current");

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft]);

  const advance = useCallback(() => {
    setQueue((prev) => {
      const currentIdx = prev.findIndex((r) => r.status === "current");
      if (currentIdx < 0 || prev.length < 2) return prev;
      const next: SpeakerQueueDemoRow[] = prev.map((row) => ({ ...row, status: "waiting" }));
      const afterCurrent = (currentIdx + 1) % next.length;
      next[afterCurrent] = { ...next[afterCurrent]!, status: "current" };
      return next;
    });
    setSecondsLeft(90);
    setRunning(true);
  }, []);

  const moveRow = useCallback((id: string, dir: "up" | "down") => {
    setQueue((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const j = dir === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j]!, copy[idx]!];
      return copy;
    });
  }, []);

  const setCurrent = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((row) => ({
        ...row,
        status: row.id === id ? ("current" as const) : ("waiting" as const),
      }))
    );
  }, []);

  const removeRow = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.filter((row) => row.id !== id);
      if (next.length === 0) return prev;
      if (!next.some((row) => row.status === "current")) {
        next[0] = { ...next[0]!, status: "current" };
      }
      return next;
    });
  }, []);

  return (
    <section className={cn(heroCompact ? "space-y-2" : "space-y-3", className)}>
      <div className={MARKETING_CHAMBER_PREVIEW}>
        <h3 className={cn("font-sans font-semibold text-brand-navy", heroCompact ? "text-base" : "text-lg")}>
          🎤 {tq("speakerList")}
        </h3>
        {!compactIntro ? (
          <p className="mt-1 text-sm text-brand-muted">
            {tq("introPrefix")}{" "}
            <span className="font-medium text-brand-navy">{tq("requestToSpeak")}</span> {tq("introMiddle")}{" "}
            <span className="font-medium text-[var(--accent)]">{tq("sessionTimerLink")}</span>{" "}
            {tq("introSuffixPrefix")}{" "}
            <strong className="font-medium text-brand-navy">{tq("advanceSpeaker")}</strong>.
          </p>
        ) : null}
      </div>

      <div className={cn(MARKETING_SESSION_SURFACE, heroCompact ? "space-y-2" : "space-y-4")}>
        <div className={cn("space-y-2", MARKETING_SESSION_INSET, heroCompact ? "p-2" : "space-y-3 p-3")}>
          <div>
            <p className={SESSION_FLOOR_LABEL}>{tTimer("speakerTimeRemaining")}</p>
            {!heroCompact ? (
              <p className="mt-0.5 text-[0.65rem] font-normal normal-case text-brand-muted">
                {tTimer("remainingHelpPerSpeaker")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-brand-muted">{tTimer("currentSpeaker")}</p>
              <p className={cn("font-sans font-semibold text-brand-navy", heroCompact ? "text-sm" : "text-base")}>
                {current?.country ?? tq("dash")}
              </p>
            </div>
            <p
              className={cn(
                "font-mono font-semibold tabular-nums text-[var(--accent)]",
                heroCompact ? "text-xl" : "text-2xl"
              )}
              suppressHydrationWarning
            >
              {formatTimer(secondsLeft)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setRunning((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-brand-navy/20 bg-white font-medium text-zinc-900 hover:bg-brand-cream",
                heroCompact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
              )}
            >
              {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {running ? tTimer("pauseClock") : tTimer("startClock")}
            </button>
            <button
              type="button"
              onClick={advance}
              disabled={queue.length < 2}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg bg-brand-accent font-medium text-white hover:opacity-90 disabled:opacity-50",
                heroCompact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
              )}
            >
              <SkipForward className="h-4 w-4" aria-hidden />
              {tTimer("advanceSpeakerReset")}
            </button>
          </div>
        </div>

        {!heroCompact ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1 text-sm text-brand-navy">
            <span className={SESSION_FLOOR_LABEL}>{tq("addDelegation")}</span>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-2 text-sm text-brand-navy shadow-inner focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              defaultValue=""
              aria-label={tq("addDelegation")}
            >
              <option value="">{tq("select")}</option>
              <option value="canada">Canada</option>
              <option value="ghana">Ghana</option>
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-2 text-sm font-medium text-brand-navy hover:bg-[var(--material-thick)]"
          >
            {tq("add")}
          </button>
        </div>
        ) : null}

        <ul className={cn("text-brand-navy", heroCompact ? "space-y-1" : "space-y-2")}>
          {(heroCompact ? sorted.slice(0, 3) : sorted).map((row, pos) => (
            <li
              key={row.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)]",
                heroCompact ? "py-1.5" : "py-2"
              )}
            >
              <span className="font-medium">
                {row.country}{" "}
                <span className="text-xs font-normal text-brand-muted">
                  ({tq(`status.${row.status}`)})
                </span>
              </span>
              <span className="flex flex-wrap gap-1 sm:gap-2">
                <button
                  type="button"
                  disabled={pos <= 0}
                  className="rounded-md p-1.5 text-brand-muted hover:bg-brand-navy/5 hover:text-brand-navy disabled:opacity-30"
                  title={tq("moveUp")}
                  aria-label={tq("moveUp")}
                  onClick={() => moveRow(row.id, "up")}
                >
                  <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={pos >= sorted.length - 1}
                  className="rounded-md p-1.5 text-brand-muted hover:bg-brand-navy/5 hover:text-brand-navy disabled:opacity-30"
                  title={tq("moveDown")}
                  aria-label={tq("moveDown")}
                  onClick={() => moveRow(row.id, "down")}
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                  onClick={() => setCurrent(row.id)}
                >
                  {tq("current")}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-red-700 hover:underline dark:text-red-300"
                  onClick={() => removeRow(row.id)}
                >
                  {tq("remove")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
