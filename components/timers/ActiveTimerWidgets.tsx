// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { shouldShowLiveFloorTimerUI, useConferenceTimer } from "@/lib/use-conference-timer";
import {
  committeeSessionEndTimestampMs,
  formatCountdownOrElapsed,
} from "@/lib/committee-session-end";
import { useNowMs } from "@/lib/hooks/useNowMs";
import { COMMITTEE_SESSION_UPDATED_EVENT } from "@/lib/committee-session-sync";
import { cn } from "@/lib/utils";

type WidgetTheme = "light" | "dark" | "page";

function formatMmSs(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSessionElapsed(startIso: string, nowMs: number): string {
  const t0 = new Date(startIso).getTime();
  if (Number.isNaN(t0)) return "—";
  let sec = Math.max(0, Math.floor((nowMs - t0) / 1000));
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function chipClass(theme: WidgetTheme, live: boolean) {
  if (theme === "page") {
    return cn(
      "min-w-[8.5rem] max-w-[14rem] rounded-xl border px-3 py-2 shadow-sm",
      live
        ? "border-brand-accent/40 bg-brand-accent/10"
        : "border-[var(--hairline)] bg-[var(--dashboard-card)]"
    );
  }
  if (theme === "light") {
    return cn(
      "min-w-[8rem] max-w-[13rem] rounded-[var(--radius-md)] border px-2.5 py-1.5",
      live
        ? "border-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)]"
        : "border-[var(--hairline)] bg-white"
    );
  }
  return cn(
    "min-w-[8rem] max-w-[13rem] rounded-[var(--radius-md)] border px-2.5 py-1.5",
    live ? "border-brand-accent/40 bg-brand-accent/10" : "border-white/10 bg-black/20"
  );
}

function TimerChip({
  label,
  clock,
  hint,
  live,
  paused,
  theme,
}: {
  label: string;
  clock: string;
  hint?: string | null;
  live?: boolean;
  paused?: boolean;
  theme: WidgetTheme;
}) {
  const t = useTranslations("timersWidget");
  return (
    <div className={chipClass(theme, !!live && !paused)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1.5 font-mono text-lg font-semibold tabular-nums leading-none text-brand-navy">
        <span suppressHydrationWarning>{clock}</span>
        {live && !paused ? (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
        ) : null}
      </p>
      {hint ? <p className="mt-1 truncate text-[0.7rem] text-brand-navy/80">{hint}</p> : null}
      {paused ? (
        <p className="mt-0.5 text-[0.65rem] font-medium text-amber-800 dark:text-amber-300">{t("paused")}</p>
      ) : null}
    </div>
  );
}

export function ActiveTimerWidgets({
  conferenceId,
  sessionConferenceId,
  activeVoteItemId = null,
  chairSeesRawTimer = false,
  showIdleFloorTimer = false,
  theme = "light",
}: {
  conferenceId: string;
  sessionConferenceId?: string;
  activeVoteItemId?: string | null;
  chairSeesRawTimer?: boolean;
  /** Timer page: keep the floor chip visible even when the clock is idle. */
  showIdleFloorTimer?: boolean;
  theme?: WidgetTheme;
}) {
  const t = useTranslations("timersWidget");
  const tf = useTranslations("session.floorStatus");
  const sessionScopeId = sessionConferenceId ?? conferenceId;
  const nowMs = useNowMs(true);
  const { timer, remaining, total, isRunning, perSpeakerMode } = useConferenceTimer(
    conferenceId,
    activeVoteItemId,
    chairSeesRawTimer
  );
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState<number | null>(null);
  const [sessionEndsAt, setSessionEndsAt] = useState<string | null>(null);

  const loadSession = useCallback(() => {
    const supabase = createClient();
    return supabase
      .from("procedure_states")
      .select("committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at")
      .eq("conference_id", sessionScopeId)
      .maybeSingle()
      .then(({ data, error }) => {
        const errorMessage = String(error?.message ?? "");
        const missingSessionColumns =
          /schema cache/i.test(errorMessage) &&
          /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at/i.test(
            errorMessage
          );
        if (missingSessionColumns) {
          setSessionStartedAt(null);
          setSessionDurationSeconds(null);
          setSessionEndsAt(null);
          return;
        }
        const row = data as {
          committee_session_started_at?: string | null;
          committee_session_duration_seconds?: number | null;
          committee_session_ends_at?: string | null;
        } | null;
        setSessionStartedAt(row?.committee_session_started_at ?? null);
        setSessionDurationSeconds(row?.committee_session_duration_seconds ?? null);
        setSessionEndsAt(row?.committee_session_ends_at ?? null);
      });
  }, [sessionScopeId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onUpdated = () => void loadSession();
    window.addEventListener(COMMITTEE_SESSION_UPDATED_EVENT, onUpdated);
    const supabase = createClient();
    const ch = supabase
      .channel(`active-timer-widgets-session-${sessionScopeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${sessionScopeId}`,
        },
        () => void loadSession()
      )
      .subscribe();
    return () => {
      window.removeEventListener(COMMITTEE_SESSION_UPDATED_EVENT, onUpdated);
      void supabase.removeChannel(ch);
    };
  }, [loadSession, sessionScopeId]);

  const sessionEndMs = committeeSessionEndTimestampMs(
    sessionStartedAt,
    sessionDurationSeconds,
    sessionEndsAt
  );
  const limitFmt =
    sessionStartedAt != null && sessionEndMs != null && nowMs > 0
      ? formatCountdownOrElapsed(sessionEndMs, nowMs)
      : null;
  const sessionLive = Boolean(sessionStartedAt);
  const sessionClock = sessionStartedAt && nowMs > 0 ? formatSessionElapsed(sessionStartedAt, nowMs) : "—";
  const sessionHint = !sessionStartedAt
    ? tf("sessionNotStarted")
    : limitFmt
      ? limitFmt.label === "remaining"
        ? tf("limitRemaining", { value: limitFmt.text })
        : tf("limitOverBy", { value: limitFmt.text })
      : null;

  const showFloor =
    timer != null && (showIdleFloorTimer || shouldShowLiveFloorTimerUI(timer, isRunning));
  const floorLabel = timer?.floor_label?.trim() || (perSpeakerMode ? t("speakerClock") : t("timer"));
  const floorClock = timer
    ? `${formatMmSs(remaining)} / ${formatMmSs(total)}`
    : t("dash");
  const floorHint = [
    timer?.current_speaker?.trim(),
    timer?.next_speaker?.trim() ? `→ ${timer.next_speaker.trim()}` : null,
    timer?.current_pause_reason?.trim()
      ? t("pauseReason", { reason: timer.current_pause_reason.trim() })
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-wrap items-stretch gap-2" aria-label={t("activeTimersAria")}>
      <TimerChip
        theme={theme}
        label={tf("sessionTime")}
        clock={sessionClock}
        hint={sessionHint}
        live={sessionLive}
      />
      {showFloor ? (
        <TimerChip
          theme={theme}
          label={floorLabel}
          clock={floorClock}
          hint={floorHint || null}
          live={isRunning}
          paused={!isRunning && shouldShowLiveFloorTimerUI(timer, isRunning)}
        />
      ) : null}
    </div>
  );
}

export function ActiveTimerWidgetsHeading({ theme = "page" }: { theme?: WidgetTheme }) {
  const t = useTranslations("timersWidget");
  return (
    <div className="flex items-center gap-2">
      <Clock
        className={theme === "dark" ? "h-4 w-4 text-brand-accent-bright" : "h-4 w-4 text-brand-accent"}
        aria-hidden
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("activeTimers")}</p>
    </div>
  );
}
