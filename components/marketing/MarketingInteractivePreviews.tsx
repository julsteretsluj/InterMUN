// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { HelpButton } from "@/components/HelpButton";
import type { RollAttendance } from "@/lib/roll-attendance";
import {
  ROLL_ATTENDANCE_BUTTONS,
} from "@/lib/roll-call-attendance-buttons";
import { cn } from "@/lib/utils";

import { MarketingDelegatePrepWorkspacePanel } from "@/components/marketing/MarketingDelegatePrepWorkspacePanel";
import { MarketingSessionLiveCommitteesPanel } from "@/components/marketing/MarketingSessionLiveCommitteesPanel";
import { MarketingSessionSpeakersPanel } from "@/components/marketing/MarketingSessionSpeakersPanel";
import { MarketingSessionVoteRecordingPanel } from "@/components/marketing/MarketingSessionVoteRecordingPanel";
import {
  MARKETING_CHAMBER_PREVIEW,
  MARKETING_DARK_GLASS_CARD,
  MARKETING_SESSION_INSET,
  marketingRollAttendanceButtonClass,
} from "@/components/marketing/marketing-preview-styles";
type RollRow = { id: string; country: string; status: RollAttendance };

const HERO_ROLL_ALL: RollRow[] = [
  { id: "kenya", country: "Kenya", status: "present_voting" },
  { id: "mexico", country: "Mexico", status: "present_voting" },
  { id: "norway", country: "Norway", status: "present_abstain" },
  { id: "philippines", country: "Philippines", status: "absent" },
  { id: "canada", country: "Canada", status: "present_voting" },
  { id: "ghana", country: "Ghana", status: "present_voting" },
  { id: "peru", country: "Peru", status: "present_abstain" },
  { id: "sweden", country: "Sweden", status: "absent" },
];

const HERO_ROLL_SEED = HERO_ROLL_ALL.slice(0, 4);

function MarketingRollCallCard({
  rows,
  onSetAttendance,
  heroCompact = false,
}: {
  rows: RollRow[];
  onSetAttendance: (id: string, status: RollAttendance) => void;
  heroCompact?: boolean;
}) {
  const t = useTranslations("sessionControlClient");
  const initBtn =
    "rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-2 text-sm font-medium text-brand-navy hover:bg-[var(--material-thick)]";

  return (
    <section className={cn(heroCompact ? "space-y-2" : "space-y-4")}>
      <div className={cn(heroCompact ? "space-y-2" : "space-y-4", MARKETING_CHAMBER_PREVIEW)}>
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn("font-display font-semibold text-brand-navy", heroCompact ? "text-base" : "text-lg")}>
            ✅ {t("rollCallTracker")}
          </h3>
          {!heroCompact ? (
          <HelpButton title={t("rollCallTracker")}>
            {t("rollCallHelp")}
          </HelpButton>
          ) : null}
        </div>
        {!heroCompact ? <p className="text-sm text-brand-muted">{t("rollCallIntro")}</p> : null}
      </div>
      <div className={cn(MARKETING_DARK_GLASS_CARD, heroCompact ? "space-y-2 p-2" : "space-y-4")}>
        {!heroCompact ? (
        <button type="button" className={initBtn}>
          {t("initializeRowsAllAllocations")}
        </button>
        ) : null}
        <div>
          <h4 className={cn("font-display font-semibold text-brand-navy", heroCompact ? "text-sm" : "text-base")}>
            👥 {t("delegates")}
          </h4>
          {!heroCompact ? <p className="mt-1 text-sm text-brand-muted">{t("delegateRollStatusHint")}</p> : null}
        </div>
        <ul className={cn(heroCompact ? "space-y-2 text-xs" : "space-y-3 text-sm", "text-brand-navy")}>
          {(heroCompact ? rows.slice(0, 3) : rows).map((row) => (
            <li
              key={row.id}
              className={cn(
                MARKETING_SESSION_INSET,
                "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                heroCompact ? "px-2 py-1.5" : "px-3 py-2"
              )}
            >
              <span className="shrink-0 font-medium">{row.country}</span>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t("rollCallForCountry", { country: row.country })}
              >
                {ROLL_ATTENDANCE_BUTTONS.map((opt) => {
                  const active = row.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={t(opt.titleKey)}
                      onClick={() => onSetAttendance(row.id, opt.value)}
                      className={marketingRollAttendanceButtonClass(opt.value, active)}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Hero + chair sections: roll call and speakers list with local demo state. */
export function MarketingHeroSessionPreview({
  className,
  heroCompact = false,
}: {
  className?: string;
  /** Side-by-side layout for a shorter hero chamber demo. */
  heroCompact?: boolean;
}) {
  const [roll, setRoll] = useState<RollRow[]>(HERO_ROLL_SEED);

  const setRollAttendance = useCallback((id: string, status: RollAttendance) => {
    setRoll((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }, []);

  return (
    <div className={cn(heroCompact ? "grid gap-3 md:grid-cols-2 md:items-start" : "space-y-4", className)}>
      <MarketingRollCallCard
        rows={roll}
        onSetAttendance={setRollAttendance}
        heroCompact={heroCompact}
      />
      <MarketingSessionSpeakersPanel compactIntro heroCompact={heroCompact} />
    </div>
  );
}

export function MarketingChairMotionPreview({ className }: { className?: string }) {
  const [roll, setRoll] = useState<RollRow[]>(HERO_ROLL_ALL.slice(0, 4));

  const setRollAttendance = useCallback((id: string, status: RollAttendance) => {
    setRoll((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <MarketingRollCallCard rows={roll} onSetAttendance={setRollAttendance} />
      <MarketingSessionVoteRecordingPanel compactIntro />
    </div>
  );
}

export function MarketingDelegatePrepPreview({ className }: { className?: string }) {
  return <MarketingDelegatePrepWorkspacePanel className={className} compactIntro />;
}

export function MarketingSmtOversightPreview({ className }: { className?: string }) {
  return <MarketingSessionLiveCommitteesPanel className={className} compactIntro />;
}
