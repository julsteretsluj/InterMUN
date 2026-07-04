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
  DelegateBlocMessagingDemo,
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
  variant?: "dark" | "light";
  dark?: boolean;
};

const DEMO_CONFIG: Record<MarketingFeatureRole, DemoConfig[]> = {
  chairs: [
    { id: "roll-call", sectionKey: "rollCall", Component: ChairRollCallQuorumDemo, variant: "dark", dark: true },
    { id: "speakers", sectionKey: "speakers", Component: ChairSpeakersTimerDemo, variant: "light" },
    { id: "motions", sectionKey: "motions", Component: ChairMotionQueueDemo, variant: "light" },
    { id: "voting", sectionKey: "voting", Component: ChairMotionVoteDemo, variant: "light" },
    { id: "timers", sectionKey: "timers", Component: ChairSessionTimerDemo, variant: "light" },
    { id: "awards", sectionKey: "awards", Component: ChairAwardsRubricDemo, variant: "light" },
  ],
  delegates: [
    { id: "prep", sectionKey: "prep", Component: DelegatePrepHubDemo, variant: "light" },
    { id: "resolutions", sectionKey: "resolutions", Component: DelegateResolutionClausesDemo, variant: "light" },
    { id: "amendments", sectionKey: "amendments", Component: DelegateAmendmentFloorDemo, variant: "light" },
    { id: "bloc", sectionKey: "bloc", Component: DelegateBlocMessagingDemo, variant: "light" },
    { id: "stances", sectionKey: "stances", Component: DelegateStanceHeatmapDemo, variant: "light" },
    { id: "speeches", sectionKey: "speeches", Component: DelegateSpeechPlannerDemo, variant: "light" },
  ],
  secretariat: [
    { id: "oversight", sectionKey: "oversight", Component: SmtLiveOversightDemo, variant: "light" },
    { id: "allocations", sectionKey: "allocations", Component: SmtAllocationMatrixDemo, variant: "light" },
    { id: "gates", sectionKey: "gates", Component: SmtGateCodesDemo, variant: "light" },
    { id: "awards", sectionKey: "awards", Component: SmtAwardsReviewDemo, variant: "light" },
    { id: "schedule", sectionKey: "schedule", Component: SmtEventScheduleDemo, variant: "light" },
    { id: "checklist", sectionKey: "checklist", Component: SmtSetupChecklistDemo, variant: "light" },
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
            dark={demo.dark}
            variant={demo.variant ?? "light"}
          />
        );
      })}
    </>
  );
}
