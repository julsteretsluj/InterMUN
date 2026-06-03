/**
 * SEAMUN I 2027 — twenty advisors in three lunch cohorts (not tied to a committee).
 * Pairs alternate chamber rotation vs advisor/sensory room each rotatable block.
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
  SEAMUN_I_2027_LUNCH_GROUPS,
  seamunI2027LunchGroupDefinition,
  seamunI2027LunchGroupForChamber,
  seamunI2027LunchTimingTrack,
  type SeamunLunchGroupId,
} from "@/lib/seamun-i-2027-lunch-groups";

/** Two advisors per chamber slot in the lunch cohort (partners). */
export const ADVISORS_PER_PAIR = 2;

export type SeamunAdvisorRosterId = {
  lunchGroupId: SeamunLunchGroupId;
  /** 1-based index within the lunch cohort (e.g. 1–8 in lunch group 1). */
  indexInGroup: number;
};

/** Twenty roster slots: lunch cohort × (2 advisors × chamber count). */
export const SEAMUN_I_2027_ADVISOR_ROSTER: SeamunAdvisorRosterId[] = SEAMUN_I_2027_LUNCH_GROUPS.flatMap(
  (lg) => {
    const count = lg.chambers.length * ADVISORS_PER_PAIR;
    return Array.from({ length: count }, (_, i) => ({
      lunchGroupId: lg.id,
      indexInGroup: i + 1,
    }));
  }
);

const ROSTER_KEY_SEP = ":";

export function formatSeamunAdvisorRosterKey(id: SeamunAdvisorRosterId): string {
  return `${id.lunchGroupId}${ROSTER_KEY_SEP}${id.indexInGroup}`;
}

export function parseSeamunAdvisorRosterKey(
  key: string | SeamunAdvisorRosterId
): SeamunAdvisorRosterId | null {
  if (typeof key !== "string") return key;
  const trimmed = key.trim();
  if (!trimmed) return null;

  const sep = trimmed.indexOf(ROSTER_KEY_SEP);
  if (sep < 0) return null;

  const lunchGroupId = trimmed.slice(0, sep).trim() as SeamunLunchGroupId;
  const indexInGroup = Number(trimmed.slice(sep + 1));
  if (lunchGroupId !== "l1" && lunchGroupId !== "l2" && lunchGroupId !== "l3") return null;
  if (!Number.isInteger(indexInGroup) || indexInGroup < 1) return null;

  const valid = SEAMUN_I_2027_ADVISOR_ROSTER.some(
    (a) => a.lunchGroupId === lunchGroupId && a.indexInGroup === indexInGroup
  );
  return valid ? { lunchGroupId, indexInGroup } : null;
}

export function seamunAdvisorsInLunchGroup(lunchGroupId: SeamunLunchGroupId): SeamunAdvisorRosterId[] {
  return SEAMUN_I_2027_ADVISOR_ROSTER.filter((a) => a.lunchGroupId === lunchGroupId);
}

const ADVISOR_SENSORY_BREAK_TITLE = "Advisor / sensory room";

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

const SHARED_CATEGORIES = new Set<SeamunLockedBlockCategory>([
  "arrival_reg",
  "ceremony",
  "lunch",
  "dismissal",
  "strategy",
  "sweep",
]);

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
  lunchGroupId: SeamunLunchGroupId
): SeamunLockedBlock[] {
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

export type SeamunAdvisorRosterPlacement = {
  lunchGroupId: SeamunLunchGroupId;
  advisorIndex: number;
  partnerSlot: 0 | 1;
  /** Rotation phase for chamber assignments (pair-based, not a home committee). */
  rotationPhase: number;
  chambers: readonly string[];
};

export function seamunAdvisorRosterPlacement(
  advisor: SeamunAdvisorRosterId
): SeamunAdvisorRosterPlacement | null {
  const def = seamunI2027LunchGroupDefinition(advisor.lunchGroupId);
  const maxIndex = def.chambers.length * ADVISORS_PER_PAIR;
  if (advisor.indexInGroup < 1 || advisor.indexInGroup > maxIndex) return null;

  const advisorIndex = advisor.indexInGroup - 1;
  const pairIndex = Math.floor(advisorIndex / ADVISORS_PER_PAIR);

  return {
    lunchGroupId: advisor.lunchGroupId,
    advisorIndex,
    partnerSlot: (advisorIndex % ADVISORS_PER_PAIR) as 0 | 1,
    rotationPhase: pairIndex % def.chambers.length,
    chambers: def.chambers,
  };
}

function advisorSensoryBreakBlock(base: SeamunLockedBlock): SeamunLockedBlock {
  return withoutLocation({
    ...base,
    title: ADVISOR_SENSORY_BREAK_TITLE,
    category: "break_general",
  });
}

function advisorSessionBlock(
  base: SeamunLockedBlock,
  chamber: string,
  sessionLabel: string
): SeamunLockedBlock {
  return withoutLocation({
    ...base,
    title: `${sessionLabel} — ${chamber}`,
    category: "session",
  });
}

function advisorChamberDutyBlock(
  base: SeamunLockedBlock,
  chamber: string,
  label: string
): SeamunLockedBlock {
  const cat = base.category === "support" ? ("support" as const) : base.category;
  return withoutLocation({
    ...base,
    title: `${label} — ${chamber}`,
    category: cat,
  });
}

/**
 * Build one roster advisor's day: cohort lunch clock; partner alternates chamber vs sensory;
 * chamber duty rotates through all committees in the lunch group.
 */
export function buildSeamunAdvisorDayBlocks(
  day: 1 | 2,
  advisor: SeamunAdvisorRosterId | string
): SeamunLockedBlock[] {
  const parsed = parseSeamunAdvisorRosterKey(advisor);
  if (!parsed) return [];

  const placement = seamunAdvisorRosterPlacement(parsed);
  if (!placement) return [];

  const timingTrack = seamunI2027LunchTimingTrack(day, placement.lunchGroupId);
  const teamCol = seamunTeamColumnForGroup(day, timingTrack);
  const { chambers, rotationPhase, partnerSlot, lunchGroupId } = placement;

  let sessionBlockIndex = 0;
  let rotatableDutyIndex = 0;

  const blocks = teamCol.blocks.map((block) => {
    if (SHARED_CATEGORIES.has(block.category)) return withoutLocation(block);

    const isRotatableDuty =
      block.category === "session" ||
      block.category === "support" ||
      block.category === "break_general" ||
      block.category === "relax";

    if (!isRotatableDuty) return withoutLocation(block);

    const onChamberDuty = (partnerSlot + rotatableDutyIndex) % ADVISORS_PER_PAIR === 0;
    rotatableDutyIndex += 1;

    if (!onChamberDuty) {
      return advisorSensoryBreakBlock(block);
    }

    const chamberIdx =
      block.category === "session" || block.category === "support"
        ? (rotationPhase + sessionBlockIndex) % chambers.length
        : (rotationPhase + rotatableDutyIndex) % chambers.length;

    if (block.category === "session") {
      sessionBlockIndex += 1;
      return advisorSessionBlock(block, chambers[chamberIdx]!, block.title);
    }

    if (block.category === "support") {
      return advisorChamberDutyBlock(block, chambers[chamberIdx]!, block.title);
    }

    return advisorChamberDutyBlock(block, chambers[chamberIdx]!, block.title);
  });

  return applyLunchGroupMeals(blocks, day, lunchGroupId);
}

export function seamunAdvisorSensoryBreakCount(
  day: 1 | 2,
  advisor: SeamunAdvisorRosterId | string
): number {
  return buildSeamunAdvisorDayBlocks(day, advisor).filter(
    (b) => b.title === ADVISOR_SENSORY_BREAK_TITLE
  ).length;
}

export function seamunDefaultGroupForCommittee(committee: string | null | undefined): SeamunScheduleGroupId | null {
  return seamunI2027DebateScheduleGroupId(seamunI2027ScheduleGroupForChamber(committee));
}

/** All chamber labels on the locked timetable (10 committees). */
export function seamunAllScheduleCommittees(): string[] {
  return SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.flatMap((g) => [...g.chambers]);
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

  const lunchGroupId = seamunI2027LunchGroupForChamber(key);
  if (!lunchGroupId) return mapped;
  return applyLunchGroupMeals(mapped, day, lunchGroupId);
}
