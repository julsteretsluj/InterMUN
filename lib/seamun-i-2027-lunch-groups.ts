/**
 * SEAMUN I 2027 — three schedule groups (10 committees). Each group shares one timetable
 * including lunch slots (see schedules.pdf). Advisor lunch cohorts mirror these groups.
 */

import type { SeamunScheduleGroupId } from "@/lib/seamun-i-2027-committee-groups";

export type SeamunLunchGroupId = "l1" | "l2" | "l3";

export type SeamunLunchGroupDefinition = {
  id: SeamunLunchGroupId;
  /** Chamber labels (exact `conferences.committee` strings). */
  chambers: readonly string[];
};

export const SEAMUN_I_2027_LUNCH_GROUPS: readonly SeamunLunchGroupDefinition[] = [
  {
    id: "l1",
    chambers: ["UNHRC", "DISEC", "Press Corps"],
  },
  {
    id: "l2",
    chambers: ["WHO", "UN Women", "UNSC"],
  },
  {
    id: "l3",
    chambers: ["ECOSOC", "UNODC", "Interpol", "FWC - Stranger Things"],
  },
] as const;

/** Each lunch cohort uses its schedule group's wall-clock eat/chill slots. */
const LUNCH_TIMING_TRACK_BY_DAY: Record<SeamunLunchGroupId, Record<1 | 2, SeamunScheduleGroupId>> = {
  l1: { 1: "g1", 2: "g1" },
  l2: { 1: "g2", 2: "g2" },
  l3: { 1: "g3", 2: "g3" },
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
