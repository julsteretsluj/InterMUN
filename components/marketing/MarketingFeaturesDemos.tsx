// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ComponentType } from "react";
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
    { id: "awards", sectionKey: "awards", Component: SmtAwardsReviewDemo },
    { id: "schedule", sectionKey: "schedule", Component: SmtEventScheduleDemo },
    { id: "checklist", sectionKey: "checklist", Component: SmtSetupChecklistDemo },
  ],
};

export function MarketingFeaturesDemos({ role }: { role: MarketingFeatureRole }) {
  const t = useTranslations(`marketing.featuresPages.${role}`);
  const demos = DEMO_CONFIG[role];

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
            reversed={index % 2 === 1}
          />
        );
      })}
    </>
  );
}
