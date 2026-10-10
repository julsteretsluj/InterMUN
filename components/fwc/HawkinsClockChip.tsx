// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useTranslations } from "next-intl";
import { FWC_ROP } from "@/lib/rop";
import { formatHawkinsClock } from "@/lib/rop/hawkins-clock";
import { useHawkinsClock } from "@/lib/hooks/useHawkinsClock";
import type { FwcSessionStateRow } from "@/lib/fwc/rop-state";

export type HawkinsClockChipProps = {
  canonicalConferenceId: string;
  initialRow: FwcSessionStateRow | null;
  initialSessionStartedAt: string | null;
  serverNowMs: number;
  className?: string;
};

export function HawkinsClockChip({ className, ...input }: HawkinsClockChipProps) {
  const t = useTranslations("fwcRop");
  const { reading } = useHawkinsClock(input);
  const label = FWC_ROP.crisis!.clock.label;
  const status = reading.pauseReason === "chair" ? t("clockPaused") : reading.pauseReason === "no_session" ? t("clockIdle") : null;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[980px] border border-[#D1D1D6] bg-white px-3 py-1 text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${className ?? ""}`}
      title={`${reading.blockLabel}${status ? ` · ${status}` : ""}`}
      aria-live="off"
      role="timer"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${reading.running ? "bg-[#34C759]" : "bg-[#AEAEB2]"}`}
      />
      <span>
        {label} · <span className="tabular-nums">{formatHawkinsClock(reading)}</span>
      </span>
      {status ? <span className="text-[12px] font-normal text-[#6E6E73]">{status}</span> : null}
    </span>
  );
}
