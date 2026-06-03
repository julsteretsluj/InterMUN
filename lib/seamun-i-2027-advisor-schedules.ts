/**
 * SEAMUN I 2027 — one advisor per committee (10); timetables follow debate/support tracks
 * with eat/chill on mixed lunch-group slots (see `seamun-i-2027-lunch-groups.ts`).
 */

import {
  SEAMUN_I_2027_DAY1_COLUMNS,
  SEAMUN_I_2027_DAY2_COLUMNS,
  type SeamunLockedBlock,
  type SeamunLockedBlockCategory,
  type SeamunLockedColumn,
} from "@/lib/seamun-i-2027-locked-schedule";
import {
  SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS,
  SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS,
  type SeamunScheduleGroupDefinition,
  type SeamunScheduleGroupId,
  seamunI2027DebateScheduleGroupId,
  seamunI2027ScheduleGroupForChamber,
} from "@/lib/seamun-i-2027-committee-groups";
import {
  seamunI2027LunchGroupForChamber,
  seamunI2027LunchTimingTrack,
} from "@/lib/seamun-i-2027-lunch-groups";

/** One school advisor per active chamber (10 committees). */
export const SEAMUN_I_2027_ADVISOR_COMMITTEES = SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.flatMap(
  (g) => [...g.chambers]
) as readonly string[];

export type SeamunAdvisorCommittee = (typeof SEAMUN_I_2027_ADVISOR_COMMITTEES)[number];

export function seamunScheduleGroupById(id: SeamunScheduleGroupId): SeamunScheduleGroupDefinition {
  const def = SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown schedule group: ${id}`);
  return def;
}

/** Day 2 column headers use rotated team names; match by group prefix. */
const GROUP_COLUMN_PREFIX: Record<SeamunScheduleGroupId, string> = {
  g1: "Group 1",
  g2: "Group 2",
  g3: "Group 3",
  g4: "Group 4",
  support: "Support",
};

export function seamunScheduleGroupForColumnHeader(header: string): SeamunScheduleGroupId | null {
  const h = header.trim();
  for (const def of SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS) {
    if (h === def.scheduleHeader) return def.id;
    if (h.startsWith(GROUP_COLUMN_PREFIX[def.id])) return def.id;
  }
  if (h.startsWith(GROUP_COLUMN_PREFIX.support)) return "support";
  return null;
}

export function seamunDebateColumnsForDay(day: 1 | 2): SeamunLockedColumn[] {
  const columns = day === 1 ? SEAMUN_I_2027_DAY1_COLUMNS : SEAMUN_I_2027_DAY2_COLUMNS;
  return SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => {
    const col =
      day === 1
        ? columns.find((c) => c.header === g.scheduleHeader)
        : columns.find((c) => c.header.startsWith(GROUP_COLUMN_PREFIX[g.id]));
    if (!col) throw new Error(`No column for ${g.id} on day ${day}`);
    return col;
  });
}

export function seamunTeamColumnForGroup(day: 1 | 2, groupId: SeamunScheduleGroupId): SeamunLockedColumn {
  const columns = day === 1 ? SEAMUN_I_2027_DAY1_COLUMNS : SEAMUN_I_2027_DAY2_COLUMNS;
  const col = columns.find((c) => seamunScheduleGroupForColumnHeader(c.header) === groupId);
  if (!col) throw new Error(`No column for ${groupId} on day ${day}`);
  return col;
}

const MEAL_CATEGORIES = new Set<SeamunLockedBlockCategory>(["lunch", "relax"]);

function withoutLocation(block: SeamunLockedBlock): SeamunLockedBlock {
  const { location: _loc, ...rest } = block;
  return rest;
}

function mealBlocksFromTrack(
  day: 1 | 2,
  trackId: SeamunScheduleGroupId
): { lunch: SeamunLockedBlock; relax: SeamunLockedBlock } | null {
  const col = seamunTeamColumnForGroup(day, trackId);
  const lunch = col.blocks.find((b) => b.category === "lunch");
  const relax = col.blocks.find((b) => b.category === "relax");
  if (!lunch || !relax) return null;
  return { lunch, relax };
}

function applyLunchGroupMeals(
  blocks: SeamunLockedBlock[],
  day: 1 | 2,
  committee: string
): SeamunLockedBlock[] {
  const lunchGroupId = seamunI2027LunchGroupForChamber(committee);
  if (!lunchGroupId) return blocks;

  const timingTrack = seamunI2027LunchTimingTrack(day, lunchGroupId);
  const meals = mealBlocksFromTrack(day, timingTrack);
  if (!meals) return blocks;

  return blocks.map((block) => {
    if (block.category === "lunch") {
      return withoutLocation({
        ...block,
        start: meals.lunch.start,
        end: meals.lunch.end,
        title: meals.lunch.title,
      });
    }
    if (block.category === "relax") {
      return withoutLocation({
        ...block,
        start: meals.relax.start,
        end: meals.relax.end,
        title: meals.relax.title,
      });
    }
    return block;
  });
}

export function seamunDefaultGroupForCommittee(committee: string | null | undefined): SeamunScheduleGroupId | null {
  return seamunI2027DebateScheduleGroupId(seamunI2027ScheduleGroupForChamber(committee));
}

/** All chamber labels on the locked timetable (10 committees). */
export function seamunAllScheduleCommittees(): string[] {
  return [...SEAMUN_I_2027_ADVISOR_COMMITTEES];
}

/**
 * Delegate/chair timetable: team track timings for this chamber, with lunch-group eat/chill.
 */
export function buildSeamunCommitteeDayBlocks(day: 1 | 2, committee: string): SeamunLockedBlock[] {
  const key = committee.trim();
  const groupId = seamunI2027ScheduleGroupForChamber(key);
  if (!groupId) return [];

  const teamCol = seamunTeamColumnForGroup(day, groupId);

  const mapped = teamCol.blocks.map((block) => {
    if (block.category === "support" && groupId === "support") {
      return withoutLocation({ ...block, title: key, category: "support" as const });
    }
    return withoutLocation(block);
  });

  return applyLunchGroupMeals(mapped, day, key);
}

/** One advisor per committee — same clock as the chamber they support. */
export function buildSeamunAdvisorDayBlocks(day: 1 | 2, committee: string): SeamunLockedBlock[] {
  return buildSeamunCommitteeDayBlocks(day, committee);
}
