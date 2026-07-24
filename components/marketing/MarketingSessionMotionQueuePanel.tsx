// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  sortMotionsMostDisruptiveFirst,
} from "@/lib/motion-disruptiveness";
import type { VoteType } from "@/types/database";
import { cn } from "@/lib/utils";

import { MARKETING_SESSION_SURFACE, MARKETING_CHAMBER_PREVIEW, MARKETING_SESSION_INSET, SESSION_FLOOR_LABEL } from "./marketing-preview-styles";

type MotionDemoRow = {
  id: string;
  title: string;
  vote_type: VoteType;
  procedure_code: string | null;
  created_at: string;
};

/** RoP-ranked pending motions — mirrors session floor `pendingStatedMotions` order. */
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
  {
    id: "order",
    title: "Point of order",
    vote_type: "motion",
    procedure_code: null,
    created_at: "2026-07-05T10:03:00.000Z",
  },
];

export function MarketingSessionMotionQueuePanel({ className }: { className?: string }) {
  const t = useTranslations("sessionControlClient");
  const motions = useMemo(
    () => sortMotionsMostDisruptiveFirst(MOTION_QUEUE_SEED),
    []
  );

  return (
    <section className={cn("space-y-3", className)}>
      <div className={MARKETING_CHAMBER_PREVIEW}>
        <h3 className="font-display text-lg font-semibold text-white">{t("motionControl")}</h3>
        <p className="mt-1 text-sm text-white/70">{t("motionControlHelp")}</p>
      </div>

      <div className={cn(MARKETING_SESSION_SURFACE, "space-y-4")}>
        <div className={cn("space-y-2 px-3 py-2", MARKETING_SESSION_INSET)}>
          <p className="text-sm font-medium text-brand-navy">
            {t("motionFloorLabel")}{" "}
            <span className="text-brand-muted">{t("closed")}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-brand-accent/50 bg-brand-accent/15 px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-accent/25"
            >
              {t("addMotionGuided")}
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-white"
            >
              {t("openFloorForMotionStatements")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-2 text-sm font-medium text-brand-navy hover:bg-[var(--material-thick)]"
            >
              {t("closeFloorStatementsEnded")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-500/50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-500/15"
            >
              {t("recordStatedMotionButton")}
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {t("beginVotingMostDisruptive")}
            </button>
          </div>
        </div>

        <div className={cn("space-y-2 px-3 py-2", MARKETING_SESSION_INSET)}>
          <p className={SESSION_FLOOR_LABEL}>{t("pendingVoteOrderMostDisruptive")}</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-navy">
            {motions.map((motion, index) => (
                <li key={motion.id} className="pl-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium">#{index + 1}</span> — {motion.title}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-red-700 hover:underline"
                    >
                      {t("withdraw")}
                    </button>
                  </div>
                </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
