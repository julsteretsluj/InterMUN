/**
 * SEAMUN I 2027 — twenty advisors in three lunch cohorts (not tied to a committee).
 * Chamber duty is balanced across each lunch group; advisors rotate committees each session.
 */

import {
  SEAMUN_I_2027_DAY1_COLUMNS,
  SEAMUN_I_2027_DAY2_COLUMNS,
  type SeamunLockedBlock,
  type SeamunLockedBlockCategory,
  type SeamunLockedColumn,
  timeToMinutes,
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

/** Global roster label 1–20 (lunch group 1 → 1–6, l2 → 7–12, l3 → 13–20). */
export function seamunAdvisorGlobalNumber(advisor: SeamunAdvisorRosterId): number {
  let offset = 0;
  for (const lg of SEAMUN_I_2027_LUNCH_GROUPS) {
    const count = seamunAdvisorsInLunchGroup(lg.id).length;
    if (lg.id === advisor.lunchGroupId) return offset + advisor.indexInGroup;
    offset += count;
  }
  return advisor.indexInGroup;
}

export function seamunAdvisorFromGlobalNumber(globalNumber: number): SeamunAdvisorRosterId | null {
  if (!Number.isInteger(globalNumber) || globalNumber < 1) return null;
  let offset = 0;
  for (const lg of SEAMUN_I_2027_LUNCH_GROUPS) {
    const count = seamunAdvisorsInLunchGroup(lg.id).length;
    if (globalNumber <= offset + count) {
      return { lunchGroupId: lg.id, indexInGroup: globalNumber - offset };
    }
    offset += count;
  }
  return null;
}

const ADVISOR_SENSORY_BREAK_TITLE = "Advisor / sensory room";

export function seamunScheduleGroupById(id: SeamunScheduleGroupId): SeamunScheduleGroupDefinition {
  const def = SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown schedule group: ${id}`);
  return def;
}

/** Day 2 column headers use the same group labels as day 1. */
const GROUP_COLUMN_PREFIX: Record<SeamunScheduleGroupId, string> = {
  g1: "Group 1",
  g2: "Group 2",
  g3: "Group 3",
};

export function seamunScheduleGroupForColumnHeader(header: string): SeamunScheduleGroupId | null {
  const h = header.trim();
  for (const def of SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS) {
    if (h === def.scheduleHeader) return def.id;
    if (h.startsWith(GROUP_COLUMN_PREFIX[def.id])) return def.id;
  }
  return null;
}

export function seamunDebateColumnsForDay(day: 1 | 2): SeamunLockedColumn[] {
  const columns = day === 1 ? SEAMUN_I_2027_DAY1_COLUMNS : SEAMUN_I_2027_DAY2_COLUMNS;
  return SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => {
    const col = columns.find(
      (c) => c.header === g.scheduleHeader || c.header.startsWith(GROUP_COLUMN_PREFIX[g.id])
    );
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
  "sweep",
]);

/** Advisors share these blocks; only committee sessions rotate chamber vs sensory room. */
const ADVISOR_SHARED_CATEGORIES = new Set<SeamunLockedBlockCategory>([
  ...SHARED_CATEGORIES,
  "relax",
  "break_general",
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

function blockDurationMinutes(block: SeamunLockedBlock): number {
  return timeToMinutes(block.end) - timeToMinutes(block.start);
}

type AdvisorDayPlan = Map<string, SeamunLockedBlock[]>;

const advisorDayPlanCache = new Map<string, AdvisorDayPlan>();

function advisorDayPlanCacheKey(day: 1 | 2, lunchGroupId: SeamunLunchGroupId): string {
  return `${day}:${lunchGroupId}`;
}

function sortAdvisorsByDutyMinutes(
  advisors: SeamunAdvisorRosterId[],
  dutyMinutes: Map<string, number>
): SeamunAdvisorRosterId[] {
  return [...advisors].sort((a, b) => {
    const ka = formatSeamunAdvisorRosterKey(a);
    const kb = formatSeamunAdvisorRosterKey(b);
    const diff = dutyMinutes.get(ka)! - dutyMinutes.get(kb)!;
    if (diff !== 0) return diff;
    return a.indexInGroup - b.indexInGroup;
  });
}

/**
 * Balance chamber duty across the lunch cohort: each session block assigns the
 * advisors with the fewest duty minutes so far; chamber labels rotate per block.
 */
function computeBalancedAdvisorDayPlan(day: 1 | 2, lunchGroupId: SeamunLunchGroupId): AdvisorDayPlan {
  const def = seamunI2027LunchGroupDefinition(lunchGroupId);
  const advisors = seamunAdvisorsInLunchGroup(lunchGroupId);
  const chambers = def.chambers;
  const nChambers = chambers.length;
  const timingTrack = seamunI2027LunchTimingTrack(day, lunchGroupId);
  const teamCol = seamunTeamColumnForGroup(day, timingTrack);

  const rosterKeys = advisors.map((a) => formatSeamunAdvisorRosterKey(a));
  const blocksByKey = new Map(rosterKeys.map((k) => [k, [] as SeamunLockedBlock[]]));
  const dutyMinutes = new Map(rosterKeys.map((k) => [k, 0]));
  let sessionBlockIndex = 0;

  for (const block of teamCol.blocks) {
    const base = withoutLocation(block);

    if (ADVISOR_SHARED_CATEGORIES.has(block.category) || block.category !== "session") {
      for (const key of rosterKeys) {
        blocksByKey.get(key)!.push(base);
      }
      continue;
    }

    const duration = blockDurationMinutes(block);
    const sorted = sortAdvisorsByDutyMinutes(advisors, dutyMinutes);
    const onDuty = sorted.slice(0, nChambers);
    const onDutyKeys = new Set(onDuty.map((a) => formatSeamunAdvisorRosterKey(a)));

    for (const adv of advisors) {
      const key = formatSeamunAdvisorRosterKey(adv);
      if (onDutyKeys.has(key)) {
        const dutyIndex = onDuty.findIndex((a) => formatSeamunAdvisorRosterKey(a) === key);
        const chamberIdx = (sessionBlockIndex + dutyIndex) % nChambers;
        blocksByKey.get(key)!.push(advisorSessionBlock(block, chambers[chamberIdx]!, block.title));
        dutyMinutes.set(key, dutyMinutes.get(key)! + duration);
      } else {
        blocksByKey.get(key)!.push(advisorSensoryBreakBlock(block));
      }
    }

    sessionBlockIndex += 1;
  }

  return blocksByKey;
}

function balancedAdvisorDayPlan(day: 1 | 2, lunchGroupId: SeamunLunchGroupId): AdvisorDayPlan {
  const cacheKey = advisorDayPlanCacheKey(day, lunchGroupId);
  let plan = advisorDayPlanCache.get(cacheKey);
  if (!plan) {
    plan = computeBalancedAdvisorDayPlan(day, lunchGroupId);
    advisorDayPlanCache.set(cacheKey, plan);
  }
  return plan;
}

/**
 * Build one roster advisor's day: cohort lunch clock; chamber duty is balanced
 * across the lunch group; committee labels rotate each session block.
 */
export function buildSeamunAdvisorDayBlocks(
  day: 1 | 2,
  advisor: SeamunAdvisorRosterId | string
): SeamunLockedBlock[] {
  const parsed = parseSeamunAdvisorRosterKey(advisor);
  if (!parsed) return [];

  const placement = seamunAdvisorRosterPlacement(parsed);
  if (!placement) return [];

  const key = formatSeamunAdvisorRosterKey(parsed);
  const blocks = balancedAdvisorDayPlan(day, placement.lunchGroupId).get(key) ?? [];
  return applyLunchGroupMeals(blocks, day, placement.lunchGroupId);
}

export function seamunAdvisorSessionDutyMinutes(
  day: 1 | 2,
  advisor: SeamunAdvisorRosterId | string
): number {
  return buildSeamunAdvisorDayBlocks(day, advisor)
    .filter((b) => b.category === "session")
    .reduce((sum, b) => sum + blockDurationMinutes(b), 0);
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
  return teamCol.blocks.map((block) => withoutLocation(block));
}
