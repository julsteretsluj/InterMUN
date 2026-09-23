// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  playTimerExpiryAlarm,
  readTimerExpiryAlarmEnabled,
  setTimerExpiryAlarmEnabled,
  TIMER_EXPIRY_ALARM_STORAGE_KEY,
} from "@/lib/timer-expiry-alarm";

/** Browser-local timer chime preference (inline; no trigger). */
export function TimerExpiryAlarmSettingsPanel({ className }: { className?: string }) {
  const t = useTranslations("chromePreferences");
  const tTheme = useTranslations("themeSelector");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readTimerExpiryAlarmEnabled());
    function onStorage(ev: StorageEvent) {
      if (ev.key === TIMER_EXPIRY_ALARM_STORAGE_KEY || ev.key === null) {
        setEnabled(readTimerExpiryAlarmEnabled());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setTimerExpiryAlarmEnabled(next);
      if (next) playTimerExpiryAlarm();
      return next;
    });
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="tag tag-neutral mb-0">{t("timerExpiryAlarmTitle")}</p>
      <button
        type="button"
        title={t("timerExpiryAlarmLabel")}
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
          enabled
            ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
            : "border-[var(--hairline)] text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
        )}
        aria-pressed={enabled}
        aria-label={`${t("timerExpiryAlarmTitle")}: ${enabled ? tTheme("on") : tTheme("off")}`}
      >
        <span className="inline-flex min-w-0 items-center gap-2 text-left">
          <Bell className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="leading-snug">{t("timerExpiryAlarmShort")}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold">{enabled ? tTheme("on") : tTheme("off")}</span>
      </button>
      <p className="text-[0.7rem] leading-snug text-brand-muted">
        {t("timerExpiryAlarmLabel")} {t("timerExpiryAlarmHint")}
      </p>
    </div>
  );
}
