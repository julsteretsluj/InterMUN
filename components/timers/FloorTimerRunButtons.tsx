// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function FloorTimerRunButtons({
  running,
  disabled,
  pending,
  onStart,
  onPause,
  size = "lg",
}: {
  running: boolean;
  disabled?: boolean;
  pending?: boolean;
  onStart: () => void;
  onPause: () => void;
  size?: "lg" | "md";
}) {
  const t = useTranslations("session.timerPage");
  const compact = size === "md";
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45";
  const sizing = compact ? "px-3 py-2 text-xs" : "min-w-[8.5rem] px-5 py-3 text-sm";
  const icon = compact ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className={cn("flex flex-wrap items-center", compact ? "gap-1.5" : "gap-2.5")}>
      <button
        type="button"
        disabled={pending || disabled || running}
        onClick={onStart}
        className={cn(
          base,
          sizing,
          running
            ? "border border-[var(--hairline)] bg-[var(--material-thin)] text-brand-muted"
            : "bg-[#007AFF] text-white shadow-sm hover:opacity-90"
        )}
      >
        <Play className={icon} aria-hidden />
        {t("start")}
      </button>
      <button
        type="button"
        disabled={pending || disabled || !running}
        onClick={onPause}
        className={cn(
          base,
          sizing,
          running
            ? "bg-amber-600 text-white shadow-sm hover:opacity-90"
            : "border border-[var(--hairline)] bg-[var(--material-thin)] text-brand-muted"
        )}
      >
        <Pause className={icon} aria-hidden />
        {t("pause")}
      </button>
    </div>
  );
}
