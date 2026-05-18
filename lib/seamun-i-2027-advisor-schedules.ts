/**
 * Per-advisor timetables derived from the locked team schedule.
 * Four advisors (A–D) per track; chamber and break-room duty rotate each session block.
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

export const SEAMUN_ADVISOR_IDS = ["A", "B", "C", "D"] as const;
export type SeamunAdvisorId = (typeof SEAMUN_ADVISOR_IDS)[number];

export function seamunAdvisorIndex(id: SeamunAdvisorId): number {
  return SEAMUN_ADVISOR_IDS.indexOf(id);
}

export function seamunScheduleGroupById(id: SeamunScheduleGroupId): SeamunScheduleGroupDefinition {
  const def = SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown schedule group: ${id}`);
  return def;
}

export function seamunTeamColumnForGroup(day: 1 | 2, groupId: SeamunScheduleGroupId): SeamunLockedColumn {
  const columns = day === 1 ? SEAMUN_I_2027_DAY1_COLUMNS : SEAMUN_I_2027_DAY2_COLUMNS;
  const def = seamunScheduleGroupById(groupId);
  const col = columns.find((c) => c.header === def.scheduleHeader);
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

function breakRoomBlock(base: SeamunLockedBlock): SeamunLockedBlock {
  return withoutLocation({
    ...base,
    title: "Break room",
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

/**
 * Assign session/support blocks so each advisor rotates chambers and break-room duty.
 * `sessionBlockIndex` advances per session/support block on the team column.
 */
function resolveSessionAssignment(
  base: SeamunLockedBlock,
  chambers: readonly string[],
  advisorIndex: number,
  sessionBlockIndex: number
): SeamunLockedBlock {
  const sessionLabel = base.title;
  const c = chambers.length;
  const s = sessionBlockIndex;
  const a = advisorIndex;

  if (c >= 4) {
    const chamberIdx = (a + s) % c;
    return advisorSessionBlock(base, chambers[chamberIdx]!, sessionLabel);
  }

  if (c === 3) {
    const breakAdvisor = s % 4;
    if (a === breakAdvisor) return breakRoomBlock(base);
    const active = [0, 1, 2, 3].filter((i) => i !== breakAdvisor);
    const pos = active.indexOf(a);
    const chamberIdx = (pos + s) % 3;
    return advisorSessionBlock(base, chambers[chamberIdx]!, sessionLabel);
  }

  if (c === 2) {
    const breakAdvisor = s % 4;
    const assistAdvisor = (s + 1) % 4;
    if (a === breakAdvisor) return breakRoomBlock(base);
    if (a === assistAdvisor) {
      return advisorSessionBlock(base, chambers[s % 2]!, `${sessionLabel} (assist)`);
    }
    const active = [0, 1, 2, 3].filter((i) => i !== breakAdvisor && i !== assistAdvisor);
    const pos = active.indexOf(a);
    const chamberIdx = (pos + s) % 2;
    return advisorSessionBlock(base, chambers[chamberIdx]!, sessionLabel);
  }

  if (c === 1) {
    const lead = s % 4;
    if (a === lead) {
      return withoutLocation({
        ...base,
        title: `${chambers[0]} — support`,
        category: "support",
      });
    }
    if (a === (lead + 1) % 4) return breakRoomBlock(base);
    return withoutLocation({ ...base, title: "Support — assist", category: "support" });
  }

  const lead = s % 4;
  if (a === lead) {
    return withoutLocation({ ...base, title: "Support room", category: "support" });
  }
  if (a === (lead + 1) % 4) return breakRoomBlock(base);
  return withoutLocation({ ...base, title: "Support — assist", category: "support" });
}

function resolveBreakOrChill(
  base: SeamunLockedBlock,
  advisorIndex: number,
  dutyBlockIndex: number
): SeamunLockedBlock {
  const onBreakRoom = dutyBlockIndex % 4 === advisorIndex;
  if (onBreakRoom) return breakRoomBlock(base);
  return base;
}

/**
 * Build one advisor's blocks for a team track on a given day.
 */
export function buildSeamunAdvisorDayBlocks(
  day: 1 | 2,
  groupId: SeamunScheduleGroupId,
  advisorId: SeamunAdvisorId
): SeamunLockedBlock[] {
  const teamCol = seamunTeamColumnForGroup(day, groupId);
  const chambers = seamunScheduleGroupById(groupId).chambers;
  const advisorIndex = seamunAdvisorIndex(advisorId);

  let sessionBlockIndex = 0;
  let dutyBlockIndex = 0;

  return teamCol.blocks.map((block) => {
    if (SHARED_CATEGORIES.has(block.category)) return withoutLocation(block);

    if (block.category === "session" || block.category === "support") {
      const out = resolveSessionAssignment(block, chambers, advisorIndex, sessionBlockIndex);
      sessionBlockIndex += 1;
      return out;
    }

    if (block.category === "break_general" || block.category === "relax") {
      const out = resolveBreakOrChill(block, advisorIndex, dutyBlockIndex);
      dutyBlockIndex += 1;
      return withoutLocation(out);
    }

    return withoutLocation(block);
  });
}

export function seamunDefaultGroupForCommittee(committee: string | null | undefined): SeamunScheduleGroupId | null {
  return seamunI2027DebateScheduleGroupId(seamunI2027ScheduleGroupForChamber(committee));
}

/** Debate chamber labels (four tracks; excludes sensory/support). */
export function seamunAllScheduleCommittees(): string[] {
  return SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.flatMap((g) => [...g.chambers]);
}

/**
 * Delegate/chair timetable: team track timings for this chamber (column header shows committee).
 */
export function buildSeamunCommitteeDayBlocks(day: 1 | 2, committee: string): SeamunLockedBlock[] {
  const key = committee.trim();
  const groupId = seamunI2027ScheduleGroupForChamber(key);
  if (!groupId) return [];

  const teamCol = seamunTeamColumnForGroup(day, groupId);

  return teamCol.blocks.map((block) => {
    if (block.category === "support" && groupId === "support") {
      return withoutLocation({ ...block, title: key, category: "support" as const });
    }
    return withoutLocation(block);
  });
}
