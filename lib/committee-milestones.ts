// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Participation milestones ("checkpoints") for committees and delegates.
 *
 * Pure, UI-agnostic tier logic. Counts are computed elsewhere (server loaders)
 * from real data; this module turns a raw count into achieved tiers + progress
 * toward the next checkpoint. i18n labels live under the `milestones` namespace.
 */

export type MilestoneScope = "committee" | "delegate";

export type MilestoneMetricId =
  | "moderated_caucuses"
  | "unmoderated_caucuses"
  | "consultations"
  | "resolutions_passed"
  | "amendments"
  | "speeches"
  | "points_raised"
  | "amendments_submitted";

export type MilestoneMetricDef = {
  id: MilestoneMetricId;
  scope: MilestoneScope;
  icon: string;
  /** Ascending thresholds. When `openEnded`, the final tier renders as "N+". */
  tiers: number[];
  /**
   * One completely unique emoji per tier (aligned index-for-index with `tiers`).
   * Every emoji across every metric is distinct so each individual checkpoint
   * has its own badge icon.
   */
  tierIcons: string[];
  openEnded: boolean;
};

/**
 * Tier thresholds mirror the requested checkpoints (1 / 5 / 10 / 20+ etc.).
 * `tierIcons` gives each checkpoint a globally-unique emoji.
 */
export const MILESTONE_METRICS: readonly MilestoneMetricDef[] = [
  {
    id: "moderated_caucuses",
    scope: "committee",
    icon: "🗣️",
    tiers: [1, 5, 10, 20],
    tierIcons: ["📢", "📣", "🎙️", "🔥"],
    openEnded: true,
  },
  {
    id: "unmoderated_caucuses",
    scope: "committee",
    icon: "🤝",
    tiers: [1, 5, 10],
    tierIcons: ["👥", "🧑‍🤝‍🧑", "🌐"],
    openEnded: true,
  },
  {
    id: "consultations",
    scope: "committee",
    icon: "💬",
    tiers: [1, 5, 10],
    tierIcons: ["🗨️", "🗯️", "💡"],
    openEnded: true,
  },
  {
    id: "resolutions_passed",
    scope: "committee",
    icon: "📜",
    tiers: [1, 2, 3, 5],
    tierIcons: ["📃", "📋", "📚", "🏛️"],
    openEnded: true,
  },
  {
    id: "amendments",
    scope: "committee",
    icon: "✏️",
    tiers: [1, 5, 10],
    tierIcons: ["📝", "🖊️", "📒"],
    openEnded: true,
  },
  {
    id: "speeches",
    scope: "delegate",
    icon: "🎤",
    tiers: [1, 5, 10, 20],
    tierIcons: ["🎧", "🔊", "📻", "🎯"],
    openEnded: true,
  },
  {
    id: "points_raised",
    scope: "delegate",
    icon: "✋",
    tiers: [1, 5, 20, 50],
    tierIcons: ["🙋", "☝️", "🤚", "🎖️"],
    openEnded: true,
  },
  {
    id: "amendments_submitted",
    scope: "delegate",
    icon: "📎",
    tiers: [1, 5, 10],
    tierIcons: ["📌", "🔖", "🗄️"],
    openEnded: true,
  },
] as const;

export const MILESTONE_METRIC_BY_ID: Record<MilestoneMetricId, MilestoneMetricDef> = Object.fromEntries(
  MILESTONE_METRICS.map((m) => [m.id, m])
) as Record<MilestoneMetricId, MilestoneMetricDef>;

export type MilestoneTierProgress = {
  threshold: number;
  /** Unique emoji for this specific checkpoint. */
  icon: string;
  /** True when this is the open-ended "N+" cap tier. */
  plus: boolean;
  achieved: boolean;
};

export type MilestoneProgress = {
  metricId: MilestoneMetricId;
  scope: MilestoneScope;
  icon: string;
  count: number;
  tiers: MilestoneTierProgress[];
  /** Highest threshold reached, or null if none reached yet. */
  highestAchieved: number | null;
  /** Next threshold to reach, or null when every tier is earned. */
  nextThreshold: number | null;
  /** 0..1 progress from the last earned tier toward the next (1 when maxed). */
  fractionToNext: number;
  earnedCount: number;
  totalTiers: number;
};

export function computeMilestoneProgress(
  metricId: MilestoneMetricId,
  count: number
): MilestoneProgress {
  const def = MILESTONE_METRIC_BY_ID[metricId];
  const safeCount = Math.max(0, Math.floor(count || 0));
  const lastIndex = def.tiers.length - 1;

  const tiers: MilestoneTierProgress[] = def.tiers.map((threshold, index) => ({
    threshold,
    icon: def.tierIcons[index] ?? def.icon,
    plus: def.openEnded && index === lastIndex,
    achieved: safeCount >= threshold,
  }));

  const achievedThresholds = def.tiers.filter((th) => safeCount >= th);
  const highestAchieved = achievedThresholds.length > 0 ? achievedThresholds[achievedThresholds.length - 1] : null;
  const nextThreshold = def.tiers.find((th) => safeCount < th) ?? null;

  let fractionToNext = 1;
  if (nextThreshold != null) {
    const floor = highestAchieved ?? 0;
    const span = nextThreshold - floor;
    fractionToNext = span > 0 ? Math.min(1, Math.max(0, (safeCount - floor) / span)) : 0;
  }

  return {
    metricId,
    scope: def.scope,
    icon: def.icon,
    count: safeCount,
    tiers,
    highestAchieved,
    nextThreshold,
    fractionToNext,
    earnedCount: achievedThresholds.length,
    totalTiers: def.tiers.length,
  };
}

export type MilestoneCounts = Partial<Record<MilestoneMetricId, number>>;

/** Compute progress for every metric of a given scope from a counts map. */
export function computeMilestonesForScope(
  scope: MilestoneScope,
  counts: MilestoneCounts
): MilestoneProgress[] {
  return MILESTONE_METRICS.filter((m) => m.scope === scope).map((m) =>
    computeMilestoneProgress(m.id, counts[m.id] ?? 0)
  );
}

/** Total earned checkpoints across the provided progress list. */
export function totalEarnedCheckpoints(list: MilestoneProgress[]): { earned: number; total: number } {
  return list.reduce(
    (acc, p) => ({ earned: acc.earned + p.earnedCount, total: acc.total + p.totalTiers }),
    { earned: 0, total: 0 }
  );
}
