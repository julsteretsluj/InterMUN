// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startScheduledCommitteeSessionAction } from "@/app/actions/committee-session";
import { syncLiveTopicToScheduleDayAction } from "@/app/actions/activeDebateTopic";
import { dispatchCommitteeSessionUpdated } from "@/lib/committee-session-sync";
import { playTimerExpiryAlarm } from "@/lib/timer-expiry-alarm";
import {
  readScheduledSessionsDay,
  scheduledClockMs,
  SCHEDULE_DAY_CHANGED_EVENT,
  SCHEDULED_SESSIONS_DAY_KEY,
  type SeamunPresetSession,
  type SeamunScheduleMilestone,
} from "@/lib/seamun-preset-sessions";
import { SMT_PROGRESS_NOTE_HREF } from "@/lib/smt-progress-note-reminder";

/** setTimeout ceiling we schedule reminders within (24h). */
const MAX_REMINDER_HORIZON_MS = 24 * 60 * 60 * 1000;

type ReminderCategory = "session" | "session_end" | "resolutions_due" | "closing_ceremony";

type ActiveReminder = {
  id: string;
  category: ReminderCategory;
  minutesBefore: number;
  title: string;
  start: string;
  preset?: SeamunPresetSession;
};

/**
 * Session / milestone reminder toasts for chairs. Lives in the dashboard shell so
 * reminders fire on any chair page, not only /chair/session.
 */
export function ChairSessionReminderHost({
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
  const [reminders, setReminders] = useState<ActiveReminder[]>([]);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const day = readScheduledSessionsDay();
      setSelectedDay(day);
      void syncLiveTopicToScheduleDayAction(day);
    });
    const onDay = (e: Event) => {
      const day = (e as CustomEvent<1 | 2>).detail;
      if (day === 1 || day === 2) {
        setSelectedDay(day);
        void syncLiveTopicToScheduleDayAction(day);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCHEDULED_SESSIONS_DAY_KEY) {
        const day = e.newValue === "2" ? 2 : 1;
        setSelectedDay(day);
        void syncLiveTopicToScheduleDayAction(day);
      }
    };
    window.addEventListener(SCHEDULE_DAY_CHANGED_EVENT, onDay);
    window.addEventListener("storage", onStorage);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(SCHEDULE_DAY_CHANGED_EVENT, onDay);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const dayPresets = useMemo(
    () => presets.filter((p) => p.day === selectedDay),
    [presets, selectedDay]
  );
  const dayMilestones = useMemo(
    () => milestones.filter((m) => m.day === selectedDay),
    [milestones, selectedDay]
  );

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
    const scheduled: (ActiveReminder & { at: number })[] = [];

    for (const preset of dayPresets) {
      const startMs = scheduledClockMs(preset.start);
      for (const minutesBefore of [5, 1, 0]) {
        scheduled.push({
          id: `session-${preset.day}-${preset.start}-${minutesBefore}`,
          category: "session",
          minutesBefore,
          title: preset.title,
          start: preset.start,
          preset,
          at: startMs - minutesBefore * 60_000,
        });
      }
      scheduled.push({
        id: `session-end-${preset.day}-${preset.end}`,
        category: "session_end",
        minutesBefore: 0,
        title: preset.title,
        start: preset.end,
        at: scheduledClockMs(preset.end),
      });
    }

    for (const milestone of dayMilestones) {
      const startMs = scheduledClockMs(milestone.start);
      for (const minutesBefore of [30, 15, 5]) {
        scheduled.push({
          id: `${milestone.kind}-${milestone.day}-${milestone.start}-${minutesBefore}`,
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
        await syncLiveTopicToScheduleDayAction(preset.day);
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
    [conferenceId, router]
  );

  if (reminders.length === 0) return null;

  function reminderTitle(reminder: ActiveReminder): string {
    if (reminder.category === "resolutions_due") return t("reminderTitleResolutions");
    if (reminder.category === "closing_ceremony") return t("reminderTitleClosing");
    if (reminder.category === "session_end") return t("reminderTitleSessionEnd");
    return t("reminderTitle");
  }

  function reminderBody(reminder: ActiveReminder): string {
    if (reminder.category === "resolutions_due") {
      return t("reminderResolutionsDue", { minutes: reminder.minutesBefore, start: reminder.start });
    }
    if (reminder.category === "closing_ceremony") {
      return t("reminderClosing", { minutes: reminder.minutesBefore, start: reminder.start });
    }
    if (reminder.category === "session_end") {
      return t("reminderSessionEnd", { title: reminder.title, start: reminder.start });
    }
    if (reminder.minutesBefore === 5) return t("reminder5Min", { title: reminder.title, start: reminder.start });
    if (reminder.minutesBefore === 1) return t("reminder1Min", { title: reminder.title, start: reminder.start });
    return t("reminderStartNow", { title: reminder.title, start: reminder.start });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 sm:justify-end sm:pr-6">
      <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2" role="status" aria-live="polite">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/50 bg-white/95 px-4 py-3 shadow-[0_12px_32px_-18px_rgba(24,49,72,0.55)] backdrop-blur-sm dark:bg-[var(--material-chrome)]"
          >
            <span aria-hidden className="text-lg">
              ⏰
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-navy">{reminderTitle(reminder)}</p>
              <p className="text-sm text-brand-navy/90">{reminderBody(reminder)}</p>
              {startingKey === `${reminder.preset?.day}-${reminder.preset?.start}` ? (
                <p className="mt-1 text-xs text-brand-muted">{t("starting")}</p>
              ) : null}
              {reminder.preset && errorByKey[`${reminder.preset.day}-${reminder.preset.start}`] ? (
                <span className="mt-1 block text-xs text-rose-500" role="alert">
                  {errorByKey[`${reminder.preset.day}-${reminder.preset.start}`]}
                </span>
              ) : null}
            </div>
            {reminder.category === "session" && reminder.preset ? (
              <button
                type="button"
                onClick={() => startPreset(reminder.preset!)}
                disabled={pending}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                <span aria-hidden>▶️</span>
                {t("startNow")}
              </button>
            ) : null}
            {reminder.category === "session_end" ? (
              <a
                href={SMT_PROGRESS_NOTE_HREF}
                onClick={() => dismissReminder(reminder.id)}
                className="inline-flex items-center justify-center rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
              >
                {t("writeSmtNote")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => dismissReminder(reminder.id)}
              className="rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 dark:hover:bg-white/15"
            >
              {t("dismissReminder")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
