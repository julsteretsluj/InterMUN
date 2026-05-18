/**
 * SEAMUN I 2027 — which debate chambers follow which master-schedule track.
 * Source of truth for timings/colours: `lib/seamun-i-2027-locked-schedule.ts` (visual day 1 & 2).
 * Committee bucketing should match the organisers’ published handbook (not stored in this repo).
 *
 * Chamber labels must match `conferences.committee` values for this event (see `seed_allocation_matrix.sql`).
 */

export type SeamunScheduleGroupId = "g1" | "g2" | "g3" | "g4" | "support";

export type SeamunScheduleGroupDefinition = {
  id: SeamunScheduleGroupId;
  /** Matches the locked visual schedule column heading. */
  scheduleHeader: string;
  /** Chamber labels (exact DB `committee` strings) debating on this track. */
  chambers: readonly string[];
};

/** Order matches Day 1 visual columns left → right. */
export const SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS: readonly SeamunScheduleGroupDefinition[] = [
  {
    id: "g1",
    scheduleHeader: "Group 1 (1st UL) — Team Alpha",
    chambers: ["ECOSOC", "UNICEF", "UNESCO", "UN Women"],
  },
  {
    id: "g2",
    scheduleHeader: "Group 2 (Mixed) — Team Beta",
    chambers: ["EU Parli", "UNHRC", "Press Corps", "F1"],
  },
  {
    id: "g3",
    scheduleHeader: "Group 3 (1st ML) — Team Gamma",
    chambers: ["DISEC", "UNODC", "WHO"],
  },
  {
    id: "g4",
    scheduleHeader: "Group 4 (2nd ML) — Team Delta",
    chambers: ["UNSC", "FWC - Stranger Things", "HSC"],
  },
  {
    id: "support",
    scheduleHeader: "Support / Sensory — Team Epsilon",
    chambers: ["Interpol"],
  },
] as const;

/** Four debate tracks only (excludes Support / Sensory — not shown in role schedule UIs). */
export const SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS = SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.filter(
  (g) => g.id !== "support"
);

export function seamunI2027DebateScheduleGroupId(
  groupId: SeamunScheduleGroupId | null | undefined
): SeamunScheduleGroupId | null {
  if (!groupId || groupId === "support") return null;
  return groupId;
}

const CHAMBER_TO_GROUP_ID = new Map<string, SeamunScheduleGroupId>();
for (const def of SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS) {
  for (const ch of def.chambers) {
    CHAMBER_TO_GROUP_ID.set(ch.trim(), def.id);
  }
}

export function seamunI2027ScheduleGroupDefinitionForChamber(
  committee: string | null | undefined
): SeamunScheduleGroupDefinition | null {
  const id = seamunI2027ScheduleGroupForChamber(committee);
  if (!id) return null;
  return SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.find((g) => g.id === id) ?? null;
}

/** Resolve schedule group for a chamber label, or null if unknown / secretariat row. */
export function seamunI2027ScheduleGroupForChamber(committee: string | null | undefined): SeamunScheduleGroupId | null {
  const key = committee?.trim();
  if (!key) return null;
  return CHAMBER_TO_GROUP_ID.get(key) ?? null;
}

export function seamunI2027HandbookPdfPath(): string | null {
  const v = process.env.NEXT_PUBLIC_SEAMUN_HANDBOOK_PDF_URL?.trim();
  return v && v.length > 0 ? v : null;
}
