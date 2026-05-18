import { buildSeamunCommitteeDayBlocks } from "@/lib/seamun-i-2027-advisor-schedules";
import { timeToMinutes } from "@/lib/seamun-i-2027-locked-schedule";
import { minutesToHHMM } from "@/lib/event-schedule";

export const SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES = 5;

export type SeamunCommitteeLunchOverlap = {
  day: 1 | 2;
  compareCommittee: string;
  primaryStart: string;
  primaryEnd: string;
  compareStart: string;
  compareEnd: string;
  overlapStart: string | null;
  overlapEnd: string | null;
  overlapMinutes: number;
};

function lunchIntervalForCommittee(
  day: 1 | 2,
  committee: string
): { startMin: number; endMin: number; start: string; end: string } | null {
  const blocks = buildSeamunCommitteeDayBlocks(day, committee);
  const lunch = blocks.find((b) => b.category === "lunch");
  if (!lunch) return null;
  const startMin = timeToMinutes(lunch.start);
  const endMin = timeToMinutes(lunch.end);
  if (endMin <= startMin) return null;
  return { startMin, endMin, start: lunch.start, end: lunch.end };
}

/**
 * Lunch overlap between one committee's track and up to five other committees (per day).
 */
export function computeSeamunCommitteeLunchOverlaps(
  day: 1 | 2,
  primaryCommittee: string,
  compareCommittees: readonly string[]
): SeamunCommitteeLunchOverlap[] {
  const primaryKey = primaryCommittee.trim();
  const primary = lunchIntervalForCommittee(day, primaryKey);
  if (!primary) return [];

  const seen = new Set<string>([primaryKey.toLowerCase()]);
  const results: SeamunCommitteeLunchOverlap[] = [];

  for (const raw of compareCommittees) {
    if (results.length >= SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES) break;
    const key = raw.trim();
    if (!key) continue;
    const norm = key.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);

    const cmp = lunchIntervalForCommittee(day, key);
    if (!cmp) continue;

    const overlapStartMin = Math.max(primary.startMin, cmp.startMin);
    const overlapEndMin = Math.min(primary.endMin, cmp.endMin);
    const overlapMinutes = Math.max(0, overlapEndMin - overlapStartMin);

    results.push({
      day,
      compareCommittee: key,
      primaryStart: primary.start,
      primaryEnd: primary.end,
      compareStart: cmp.start,
      compareEnd: cmp.end,
      overlapStart: overlapMinutes > 0 ? minutesToHHMM(overlapStartMin) : null,
      overlapEnd: overlapMinutes > 0 ? minutesToHHMM(overlapEndMin) : null,
      overlapMinutes,
    });
  }

  return results.sort((a, b) => b.overlapMinutes - a.overlapMinutes);
}
