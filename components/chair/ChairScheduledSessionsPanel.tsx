// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import type {
  SeamunPresetSession,
  SeamunScheduleMilestone,
} from "@/lib/seamun-preset-sessions";

const DAY_STORAGE_KEY = "intermun-scheduled-sessions-day";
/** setTimeout ceiling we schedule reminders within (24h). */
const MAX_REMINDER_HORIZON_MS = 24 * 60 * 60 * 1000;

type ReminderCategory = "session" | "resolutions_due" | "closing_ceremony";

type ActiveReminder = {
  id: string;
  category: ReminderCategory;
  /** Minutes before the scheduled time (0 = starting now for sessions). */
  minutesBefore: number;
  title: string;
  start: string;
  /** Present only for session reminders (enables the "Start now" action). */
  preset?: SeamunPresetSession;
};

type ScheduledReminder = ActiveReminder & { at: number };

function scheduledStartMs(hhmm: string, base: Date = new Date()): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

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
  const [reminders, setReminders] = useState<ActiveReminder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DAY_STORAGE_KEY);
      if (stored === "2") setSelectedDay(2);
    } catch {
      /* ignore */
    }
    setSoundEnabled(readTimerExpiryAlarmEnabled());
  }, []);

  const chooseDay = useCallback((day: 1 | 2) => {
    setSelectedDay(day);
    try {
      localStorage.setItem(DAY_STORAGE_KEY, String(day));
    } catch {
      /* ignore */
    }
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

  const dayMilestones = useMemo(
    () => milestones.filter((m) => m.day === selectedDay),
    [milestones, selectedDay]
  );

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const pushReminder = useCallback((reminder: ActiveReminder) => {
    setReminders((prev) => {
      if (prev.some((r) => r.id === reminder.id)) return prev;
      return [reminder, ...prev].slice(0, 5);
    });
    playTimerExpiryAlarm();
  }, []);

  useEffect(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];

    const now = Date.now();
    const scheduled: ScheduledReminder[] = [];

    for (const preset of dayPresets) {
      const startMs = scheduledStartMs(preset.start);
      for (const minutesBefore of [5, 1, 0]) {
        scheduled.push({
          id: `session-${preset.start}-${minutesBefore}`,
          category: "session",
          minutesBefore,
          title: preset.title,
          start: preset.start,
          preset,
          at: startMs - minutesBefore * 60_000,
        });
      }
    }

    for (const milestone of dayMilestones) {
      const startMs = scheduledStartMs(milestone.start);
      for (const minutesBefore of [30, 15, 5]) {
        scheduled.push({
          id: `${milestone.kind}-${milestone.start}-${minutesBefore}`,
          category: milestone.kind,
          minutesBefore,
          title: milestone.title,
          start: milestone.start,
          at: startMs - minutesBefore * 60_000,
        });
      }
    }

    for (const item of scheduled) {
      const delay = item.at - now;
      if (delay <= 0 || delay > MAX_REMINDER_HORIZON_MS) continue;
      const { at: _at, ...reminder } = item;
      const timeoutId = window.setTimeout(() => pushReminder(reminder), delay);
      timeoutsRef.current.push(timeoutId);
    }

    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [dayPresets, dayMilestones, pushReminder]);

  const dismissReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
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
        setReminders((prev) =>
          prev.filter((r) => !(r.preset && `${r.preset.day}-${r.preset.start}` === key))
        );
        dispatchCommitteeSessionUpdated(res.canonicalConferenceId ?? conferenceId);
        router.refresh();
      });
    },
    [conferenceId, router, startTransition]
  );

  if (presets.length === 0 && milestones.length === 0) return null;

  function reminderTitle(reminder: ActiveReminder): string {
    if (reminder.category === "resolutions_due") return t("reminderTitleResolutions");
    if (reminder.category === "closing_ceremony") return t("reminderTitleClosing");
    return t("reminderTitle");
  }

  function reminderBody(reminder: ActiveReminder): string {
    if (reminder.category === "resolutions_due") {
      return t("reminderResolutionsDue", { minutes: reminder.minutesBefore, start: reminder.start });
    }
    if (reminder.category === "closing_ceremony") {
      return t("reminderClosing", { minutes: reminder.minutesBefore, start: reminder.start });
    }
    if (reminder.minutesBefore === 5) return t("reminder5Min", { title: reminder.title, start: reminder.start });
    if (reminder.minutesBefore === 1) return t("reminder1Min", { title: reminder.title, start: reminder.start });
    return t("reminderStartNow", { title: reminder.title, start: reminder.start });
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-6 shadow-sm backdrop-blur-sm md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy md:text-xl">{t("title")}</h3>
        <HelpButton title={t("title")}>{t("help")}</HelpButton>
      </div>
      <p className="mt-1 text-sm text-brand-muted">{t("subtitle")}</p>

      {reminders.length > 0 ? (
        <div className="mt-4 space-y-2" role="status" aria-live="polite">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-3"
            >
              <span aria-hidden className="text-lg">
                ⏰
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-navy">{reminderTitle(reminder)}</p>
                <p className="text-sm text-brand-navy/90">{reminderBody(reminder)}</p>
              </div>
              {reminder.category === "session" && reminder.preset ? (
                <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[8rem]">
                  <button
                    type="button"
                    onClick={() => startPreset(reminder.preset!)}
                    disabled={pending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    <span aria-hidden>▶️</span>
                    {t("startNow")}
                  </button>
                  {errorByKey[`${reminder.preset.day}-${reminder.preset.start}`] ? (
                    <span className="text-xs text-rose-500" role="alert">
                      {errorByKey[`${reminder.preset.day}-${reminder.preset.start}`]}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => dismissReminder(reminder.id)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-white/15"
              >
                {t("dismissReminder")}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-black/20 p-1">
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
                  : "rounded-lg px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-white/10"
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
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-white/10"
        >
          <span aria-hidden>{soundEnabled ? "🔔" : "🔕"}</span>
          {soundEnabled ? t("soundOn") : t("soundOff")}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {dayPresets.length === 0 ? (
          <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-brand-muted">
            {t("noSessions")}
          </li>
        ) : (
          dayPresets.map((preset) => {
            const key = `${preset.day}-${preset.start}`;
            const startMs = scheduledStartMs(preset.start, new Date(nowMs));
            const endMs = scheduledStartMs(preset.end, new Date(nowMs));
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
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 ${
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
