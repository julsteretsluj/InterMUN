// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { sortMotionsMostDisruptiveFirst } from "@/lib/motion-disruptiveness";
import type { VoteType } from "@/types/database";
import { cn } from "@/lib/utils";
import { MARKETING_SESSION_SURFACE } from "./marketing-preview-styles";

type MotionDemoRow = {
  id: string;
  title: string;
  vote_type: VoteType;
  procedure_code: string | null;
  created_at: string;
};

const MOTION_QUEUE_SEED: MotionDemoRow[] = [
  {
    id: "close",
    title: "Closure of debate",
    vote_type: "motion",
    procedure_code: "close_debate",
    created_at: "2026-07-05T10:00:00.000Z",
  },
  {
    id: "resolution",
    title: "Introduce draft resolution A",
    vote_type: "resolution",
    procedure_code: null,
    created_at: "2026-07-05T10:01:00.000Z",
  },
  {
    id: "mod",
    title: "Moderated caucus — 10 min",
    vote_type: "motion",
    procedure_code: "moderated_caucus",
    created_at: "2026-07-05T10:02:00.000Z",
  },
];

export function MarketingSessionMotionQueuePanel({ className }: { className?: string }) {
  const t = useTranslations("sessionControlClient");
  const motions = useMemo(() => sortMotionsMostDisruptiveFirst(MOTION_QUEUE_SEED), []);

  return (
    <section className={cn("space-y-4", className)}>
      <div className={cn(MARKETING_SESSION_SURFACE, "space-y-5 p-5")}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-brand-navy">
            {t("motionControl")}
          </h3>
          <p className="text-[0.8125rem] text-brand-muted">
            {t("motionFloorLabel")} {t("closed")}
          </p>
        </div>

        <button type="button" className="mun-apple-btn mun-apple-btn-filled-blue mun-apple-btn-block">
          {t("beginVotingMostDisruptive")}
        </button>

        <div>
          <p className="mb-3 text-[0.75rem] font-medium text-brand-muted">{t("pendingVoteOrderMostDisruptive")}</p>
          <ol className="space-y-0 divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
            {motions.map((motion, index) => (
              <li
                key={motion.id}
                className="flex items-center justify-between gap-3 py-3 text-[0.9375rem] text-brand-navy"
              >
                <span className="min-w-0 truncate">
                  <span className="tabular-nums text-brand-muted">{index + 1}.</span> {motion.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
