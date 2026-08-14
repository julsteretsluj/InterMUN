// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startScheduledCommitteeSessionAction } from "@/app/actions/committee-session";
import { dispatchCommitteeSessionUpdated } from "@/lib/committee-session-sync";
import { HelpButton } from "@/components/HelpButton";
import {
  playTimerExpiryAlarm,
  readTimerExpiryAlarmEnabled,
  setTimerExpiryAlarmEnabled,
} from "@/lib/timer-expiry-alarm";
import {
  readScheduledSessionsDay,
  scheduledClockMs,
  writeScheduledSessionsDay,
  type SeamunPresetSession,
  type SeamunScheduleMilestone,
} from "@/lib/seamun-preset-sessions";

export function ChairScheduledSessionsPanel({
  conferenceId,
  presets,
  milestones = [],
}: {
  conferenceId: string;
  presets: SeamunPresetSession[];
  milestones?: SeamunScheduleMilestone[];
}) {
  const t = useTranslations("session.scheduledSessions");
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState<1 | 2>(1);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedDay(readScheduledSessionsDay());
      setSoundEnabled(readTimerExpiryAlarmEnabled());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const chooseDay = useCallback((day: 1 | 2) => {
    setSelectedDay(day);
    writeScheduledSessionsDay(day);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setTimerExpiryAlarmEnabled(next);
      if (next) playTimerExpiryAlarm();
      return next;
    });
  }, []);

  const dayPresets = useMemo(
    () => presets.filter((p) => p.day === selectedDay),
    [presets, selectedDay]
  );

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const startPreset = useCallback(
    (preset: SeamunPresetSession) => {
      const key = `${preset.day}-${preset.start}`;
      setErrorByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStartingKey(key);
      startTransition(async () => {
        const res = await startScheduledCommitteeSessionAction({
          conferenceId,
          title: preset.title,
          durationSeconds: preset.durationSeconds,
        });
        setStartingKey(null);
        if (res.error) {
          setErrorByKey((prev) => ({ ...prev, [key]: res.error! }));
          return;
        }
        dispatchCommitteeSessionUpdated(res.canonicalConferenceId ?? conferenceId);
        router.refresh();
      });
    },
    [conferenceId, router]
  );

  if (presets.length === 0 && milestones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--dashboard-card)] p-6 shadow-sm backdrop-blur-sm md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-lg font-semibold text-brand-navy md:text-xl">{t("title")}</h3>
        <HelpButton title={t("title")}>{t("help")}</HelpButton>
      </div>
      <p className="mt-1 text-sm text-brand-muted">{t("subtitle")}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--material-thin)] p-1">
          <span className="px-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            {t("dayLabel")}
          </span>
          {([1, 2] as const).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => chooseDay(day)}
              aria-pressed={selectedDay === day}
              className={
                selectedDay === day
                  ? "rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-lg px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 dark:hover:bg-white/10"
              }
            >
              {day === 1 ? t("day1") : t("day2")}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-brand-navy/5 dark:hover:bg-white/10"
        >
          <span aria-hidden>{soundEnabled ? "🔔" : "🔕"}</span>
          {soundEnabled ? t("soundOn") : t("soundOff")}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {dayPresets.length === 0 ? (
          <li className="rounded-xl border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-3 text-sm text-brand-muted">
            {t("noSessions")}
          </li>
        ) : (
          dayPresets.map((preset) => {
            const key = `${preset.day}-${preset.start}`;
            const startMs = scheduledClockMs(preset.start, new Date(nowMs));
            const endMs = scheduledClockMs(preset.end, new Date(nowMs));
            const minutes = Math.round(preset.durationSeconds / 60);
            const isLive = nowMs >= startMs && nowMs < endMs;
            const isPast = nowMs >= endMs;
            const minutesUntil = Math.ceil((startMs - nowMs) / 60_000);

            let statusLabel = t("statusUpcoming");
            let statusClass = "text-brand-muted";
            if (isPast) {
              statusLabel = t("statusPast");
              statusClass = "text-brand-muted/70";
            } else if (isLive) {
              statusLabel = t("statusLive");
              statusClass = "text-brand-diplomatic dark:text-brand-accent-bright";
            } else if (minutesUntil <= 0) {
              statusLabel = t("statusStartingNow");
              statusClass = "text-amber-700 dark:text-amber-200";
            } else if (minutesUntil <= 60) {
              statusLabel = t("statusStartsIn", { minutes: minutesUntil });
              statusClass = "text-amber-700 dark:text-amber-200";
            }

            return (
              <li
                key={key}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-3 ${
                  isPast ? "opacity-60" : ""
                }`}
              >
                <span className="font-mono text-sm tabular-nums text-brand-navy">
                  {preset.start}–{preset.end}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-brand-navy">{preset.title}</span>
                <span className="text-xs text-brand-muted">{t("durationLabel", { minutes })}</span>
                <span className={`text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                <button
                  type="button"
                  onClick={() => startPreset(preset)}
                  disabled={pending}
                  aria-label={t("startAria", { title: preset.title, start: preset.start })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  <span aria-hidden>▶️</span>
                  {startingKey === key ? t("starting") : t("start")}
                </button>
                {errorByKey[key] ? (
                  <span className="w-full text-xs text-rose-500" role="alert">
                    {errorByKey[key]}
                  </span>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <p className="mt-3 text-xs text-brand-muted">{t("remindersHint")}</p>
    </div>
  );
}
