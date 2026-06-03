/**
 * SEAMUN I 2027 — three mixed lunch cohorts (10 committees → 3 groups).
 * Session clocks stay on each chamber’s debate/support track; eat + chill use the lunch group slot.
 */

import type { SeamunScheduleGroupId } from "@/lib/seamun-i-2027-committee-groups";

export type SeamunLunchGroupId = "l1" | "l2" | "l3";

export type SeamunLunchGroupDefinition = {
  id: SeamunLunchGroupId;
  /** Chamber labels (exact `conferences.committee` strings). */
  chambers: readonly string[];
};

/** Mixed cohorts: spread debate tracks so delegates meet across committees. */
export const SEAMUN_I_2027_LUNCH_GROUPS: readonly SeamunLunchGroupDefinition[] = [
  {
    id: "l1",
    chambers: ["ECOSOC", "UNHRC", "DISEC", "Interpol"],
  },
  {
    id: "l2",
    chambers: ["UN Women", "Press Corps", "UNSC"],
  },
  {
    id: "l3",
    chambers: ["UNODC", "WHO", "FWC - Stranger Things"],
  },
] as const;

/** Wall-clock eat/chill source track per lunch group (Day 1 / Day 2 columns differ but times align). */
const LUNCH_TIMING_TRACK_BY_DAY: Record<SeamunLunchGroupId, Record<1 | 2, SeamunScheduleGroupId>> = {
  l1: { 1: "g1", 2: "g4" },
  l2: { 1: "g2", 2: "g3" },
  l3: { 1: "g3", 2: "g2" },
};

const CHAMBER_TO_LUNCH_GROUP = new Map<string, SeamunLunchGroupId>();
for (const def of SEAMUN_I_2027_LUNCH_GROUPS) {
  for (const ch of def.chambers) {
    CHAMBER_TO_LUNCH_GROUP.set(ch.trim(), def.id);
  }
}

export function seamunI2027LunchGroupForChamber(
  committee: string | null | undefined
): SeamunLunchGroupId | null {
  const key = committee?.trim();
  if (!key) return null;
  return CHAMBER_TO_LUNCH_GROUP.get(key) ?? null;
}

export function seamunI2027LunchGroupDefinition(
  id: SeamunLunchGroupId
): SeamunLunchGroupDefinition {
  const def = SEAMUN_I_2027_LUNCH_GROUPS.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown lunch group: ${id}`);
  return def;
}

export function seamunI2027LunchTimingTrack(
  day: 1 | 2,
  lunchGroupId: SeamunLunchGroupId
): SeamunScheduleGroupId {
  return LUNCH_TIMING_TRACK_BY_DAY[lunchGroupId][day];
}
