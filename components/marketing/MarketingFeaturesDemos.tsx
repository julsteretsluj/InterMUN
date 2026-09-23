// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MarketingFeatureDemoSection } from "@/components/marketing/MarketingFeatureDemoSection";
import {
  ChairAwardsRubricDemo,
  ChairMotionQueueDemo,
  ChairMotionVoteDemo,
  ChairRollCallQuorumDemo,
  ChairSessionTimerDemo,
  ChairSpeakersTimerDemo,
  DelegateAmendmentFloorDemo,
  DelegatePrepHubDemo,
  DelegateResolutionClausesDemo,
  DelegateSpeechPlannerDemo,
  DelegateStanceHeatmapDemo,
  SmtAllocationMatrixDemo,
  SmtAwardsReviewDemo,
  SmtEventScheduleDemo,
  SmtGateCodesDemo,
  SmtLiveOversightDemo,
  SmtSetupChecklistDemo,
} from "@/components/marketing/MarketingRoleFeaturePreviews";

export type MarketingFeatureRole = "chairs" | "delegates" | "secretariat";

type DemoConfig = {
  id: string;
  sectionKey: string;
  Component: ComponentType;
};

const DEMO_CONFIG: Record<MarketingFeatureRole, DemoConfig[]> = {
  chairs: [
    { id: "roll-call", sectionKey: "rollCall", Component: ChairRollCallQuorumDemo },
    { id: "speakers", sectionKey: "speakers", Component: ChairSpeakersTimerDemo },
    { id: "motions", sectionKey: "motions", Component: ChairMotionQueueDemo },
    { id: "voting", sectionKey: "voting", Component: ChairMotionVoteDemo },
    { id: "timers", sectionKey: "timers", Component: ChairSessionTimerDemo },
    { id: "awards", sectionKey: "awards", Component: ChairAwardsRubricDemo },
  ],
  delegates: [
    { id: "prep", sectionKey: "prep", Component: DelegatePrepHubDemo },
    { id: "resolutions", sectionKey: "resolutions", Component: DelegateResolutionClausesDemo },
    { id: "amendments", sectionKey: "amendments", Component: DelegateAmendmentFloorDemo },
    { id: "stances", sectionKey: "stances", Component: DelegateStanceHeatmapDemo },
    { id: "speeches", sectionKey: "speeches", Component: DelegateSpeechPlannerDemo },
  ],
  secretariat: [
    { id: "oversight", sectionKey: "oversight", Component: SmtLiveOversightDemo },
    { id: "allocations", sectionKey: "allocations", Component: SmtAllocationMatrixDemo },
    { id: "gates", sectionKey: "gates", Component: SmtGateCodesDemo },
    { id: "checklist", sectionKey: "checklist", Component: SmtSetupChecklistDemo },
    { id: "awards", sectionKey: "awards", Component: SmtAwardsReviewDemo },
    { id: "schedule", sectionKey: "schedule", Component: SmtEventScheduleDemo },
  ],
};

const PRIMARY_COUNT = 4;

function DemoSectionList({
  demos,
  role,
  startIndex = 0,
}: {
  demos: DemoConfig[];
  role: MarketingFeatureRole;
  startIndex?: number;
}) {
  const t = useTranslations(`marketing.featuresPages.${role}`);

  return (
    <>
      {demos.map((demo, index) => {
        const { Component } = demo;
        const bullets = [1, 2, 3].map((n) => t(`sections.${demo.sectionKey}.bullet${n}` as const));

        return (
          <MarketingFeatureDemoSection
            key={demo.id}
            id={demo.id}
            index={t(`sections.${demo.sectionKey}.index`)}
            eyebrow={t(`sections.${demo.sectionKey}.eyebrow`)}
            title={t(`sections.${demo.sectionKey}.title`)}
            description={t(`sections.${demo.sectionKey}.description`)}
            bullets={bullets}
            previewLabel={t(`sections.${demo.sectionKey}.previewLabel`)}
            preview={<Component />}
            reversed={(startIndex + index) % 2 === 1}
          />
        );
      })}
    </>
  );
}

export function MarketingFeaturesDemos({ role }: { role: MarketingFeatureRole }) {
  const t = useTranslations("marketing");
  const demos = DEMO_CONFIG[role];
  const primary = demos.slice(0, PRIMARY_COUNT);
  const more = demos.slice(PRIMARY_COUNT);
  const [showMore, setShowMore] = useState(false);
  const moreLabel = t("nav.moreOnTheFloor");

  return (
    <>
      <DemoSectionList demos={primary} role={role} />
      {more.length > 0 ? (
        <div className="border-t border-[var(--clicky-line)] py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 text-center md:px-8">
            {!showMore ? (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="clicky-pill clicky-pill-ghost"
              >
                {moreLabel}
              </button>
            ) : (
              <p className="clicky-eyebrow mb-2">{moreLabel}</p>
            )}
          </div>
          {showMore ? <DemoSectionList demos={more} role={role} startIndex={PRIMARY_COUNT} /> : null}
        </div>
      ) : null}
    </>
  );
}
