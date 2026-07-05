"use client";

import { useTranslations } from "next-intl";
import { motionDisruptivenessScore } from "@/lib/motion-disruptiveness";
import type { VoteType } from "@/types/database";
import { cn } from "@/lib/utils";

import { MARKETING_SESSION_SURFACE, MARKETING_CHAMBER_PREVIEW, SESSION_FLOOR_LABEL } from "./marketing-preview-styles";

type MotionDemoRow = {
  id: string;
  title: string;
  sponsor: string;
  vote_type: VoteType;
  procedure_code: string | null;
};

/** RoP-ranked pending motions (most disruptive first) — mirrors session floor order. */
const MOTION_QUEUE_SEED: MotionDemoRow[] = [
  {
    id: "close",
    title: "Closure of debate",
    sponsor: "Kenya",
    vote_type: "motion",
    procedure_code: "close_debate",
  },
  {
    id: "resolution",
    title: "Introduce draft resolution A",
    sponsor: "Mexico",
    vote_type: "resolution",
    procedure_code: null,
  },
  {
    id: "mod",
    title: "Moderated caucus — 10 min",
    sponsor: "Norway",
    vote_type: "motion",
    procedure_code: "moderated_caucus",
  },
  {
    id: "order",
    title: "Point of order",
    sponsor: "Philippines",
    vote_type: "motion",
    procedure_code: null,
  },
];

export function MarketingSessionMotionQueuePanel({ className }: { className?: string }) {
  const t = useTranslations("sessionControlClient");
  const motions = MOTION_QUEUE_SEED;

  return (
    <section className={cn("space-y-3", className)}>
      <div className={MARKETING_CHAMBER_PREVIEW}>
        <h3 className="font-display text-lg font-semibold text-white">{t("motionControl")}</h3>
        <p className="mt-1 text-sm text-white/70">{t("motionControlHelp")}</p>
      </div>

      <div className={cn(MARKETING_SESSION_SURFACE, "space-y-4")}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t("beginVotingMostDisruptive")}
          </button>
        </div>

        <div className="space-y-2 rounded-lg border border-white/12 bg-black/25 px-3 py-2">
          <p className={SESSION_FLOOR_LABEL}>{t("pendingVoteOrderMostDisruptive")}</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-navy">
            {motions.map((motion, index) => {
              const ropPriority = motionDisruptivenessScore(
                motion.vote_type,
                motion.procedure_code
              );
              const typeLabel = motion.procedure_code ?? motion.vote_type;
              return (
                <li key={motion.id} className="pl-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium">#{index + 1}</span> — {motion.title}
                      <span className="block text-xs text-brand-muted/70 sm:ml-2 sm:inline">
                        ({typeLabel}, RoP priority {ropPriority}) · {motion.sponsor}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-red-700 hover:underline"
                    >
                      {t("withdraw")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
