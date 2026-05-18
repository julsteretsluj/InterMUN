/**
 * Per-advisor timetables derived from the locked team schedule.
 * Four advisors (A–D) per track; session blocks assign chambers or rotate break-room duty.
 */

import {
  SEAMUN_I_2027_DAY1_COLUMNS,
  SEAMUN_I_2027_DAY2_COLUMNS,
  type SeamunLockedBlock,
  type SeamunLockedBlockCategory,
  type SeamunLockedColumn,
} from "@/lib/seamun-i-2027-locked-schedule";
import {
  SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS,
  type SeamunScheduleGroupDefinition,
  type SeamunScheduleGroupId,
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

function resolveSessionAssignment(
  base: SeamunLockedBlock,
  chambers: readonly string[],
  advisorIndex: number,
  sessionBlockIndex: number
): SeamunLockedBlock {
  const sessionLabel = base.title;

  if (chambers.length >= 4) {
    const chamber = chambers[advisorIndex] ?? chambers[chambers.length - 1];
    return advisorSessionBlock(base, chamber, sessionLabel);
  }

  if (chambers.length === 3) {
    const floater = sessionBlockIndex % 4;
    if (advisorIndex === floater) return breakRoomBlock(base);
    const chamberIdx = advisorIndex < floater ? advisorIndex : advisorIndex - 1;
    return advisorSessionBlock(base, chambers[chamberIdx]!, sessionLabel);
  }

  if (chambers.length === 2) {
    const roles: ("chamber" | "break" | "assist")[] = ["chamber", "chamber", "break", "assist"];
    const role = roles[(advisorIndex + sessionBlockIndex) % 4]!;
    if (role === "break") return breakRoomBlock(base);
    if (role === "assist") {
      return advisorSessionBlock(base, chambers[0]!, `${sessionLabel} (assist)`);
    }
    const chamberIdx = (advisorIndex + sessionBlockIndex) % 2;
    return advisorSessionBlock(base, chambers[chamberIdx]!, sessionLabel);
  }

  // Support track (0–1 chamber labels): rotate lead / break / assist.
  const lead = sessionBlockIndex % 4;
  if (advisorIndex === lead) {
    return withoutLocation({ ...base, title: "Support room", category: "support" });
  }
  if (advisorIndex === (lead + 1) % 4) return breakRoomBlock(base);
  return withoutLocation({ ...base, title: "Support — assist", category: "support" });
}

function resolveBreakOrChill(
  base: SeamunLockedBlock,
  advisorIndex: number,
  dutyBlockIndex: number
): SeamunLockedBlock {
  const onBreakRoom = (advisorIndex + dutyBlockIndex) % 4 === 0;
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
  return seamunI2027ScheduleGroupForChamber(committee);
}

/** All chamber labels on the locked SEAMUN I 2027 schedule (delegate/chair picker). */
export function seamunAllScheduleCommittees(): string[] {
  return SEAMUN_I_2027_SCHEDULE_GROUP_DEFINITIONS.flatMap((g) => [...g.chambers]);
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
