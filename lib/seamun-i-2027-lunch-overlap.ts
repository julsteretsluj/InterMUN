import { buildSeamunCommitteeDayBlocks } from "@/lib/seamun-i-2027-advisor-schedules";
import { timeToMinutes, type SeamunLockedBlockCategory } from "@/lib/seamun-i-2027-locked-schedule";
import { minutesToHHMM } from "@/lib/event-schedule";

export const SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES = 5;

const MEAL_CATEGORIES: readonly SeamunLockedBlockCategory[] = ["lunch", "relax"];

export type MealSubInterval = { start: string; end: string };

export type CommitteeLunchPeriod = {
  startMin: number;
  endMin: number;
  start: string;
  end: string;
  eat: MealSubInterval | null;
  chill: MealSubInterval | null;
};

export type SeamunCommitteeLunchOverlap = {
  day: 1 | 2;
  compareCommittee: string;
  primaryStart: string;
  primaryEnd: string;
  primaryEat: MealSubInterval | null;
  primaryChill: MealSubInterval | null;
  compareStart: string;
  compareEnd: string;
  compareEat: MealSubInterval | null;
  compareChill: MealSubInterval | null;
  overlapStart: string | null;
  overlapEnd: string | null;
  overlapMinutes: number;
};

/** Eat + chill blocks merged into one lunch-period window for overlap checks. */
export function lunchPeriodForCommittee(
  day: 1 | 2,
  committee: string
): CommitteeLunchPeriod | null {
  const blocks = buildSeamunCommitteeDayBlocks(day, committee);
  const eatBlock = blocks.find((b) => b.category === "lunch");
  const chillBlock = blocks.find((b) => b.category === "relax");

  const mealBlocks = blocks.filter((b) => MEAL_CATEGORIES.includes(b.category));
  if (mealBlocks.length === 0) return null;

  let startMin = Number.POSITIVE_INFINITY;
  let endMin = Number.NEGATIVE_INFINITY;
  for (const b of mealBlocks) {
    const s = timeToMinutes(b.start);
    const e = timeToMinutes(b.end);
    if (e <= s) continue;
    startMin = Math.min(startMin, s);
    endMin = Math.max(endMin, e);
  }
  if (!Number.isFinite(startMin) || endMin <= startMin) return null;

  return {
    startMin,
    endMin,
    start: minutesToHHMM(startMin),
    end: minutesToHHMM(endMin),
    eat: eatBlock ? { start: eatBlock.start, end: eatBlock.end } : null,
    chill: chillBlock ? { start: chillBlock.start, end: chillBlock.end } : null,
  };
}

/**
 * Lunch overlap between one committee's track and up to five other committees (per day).
 * Uses the combined eat + chill window, not eat alone.
 */
export function computeSeamunCommitteeLunchOverlaps(
  day: 1 | 2,
  primaryCommittee: string,
  compareCommittees: readonly string[]
): SeamunCommitteeLunchOverlap[] {
  const primaryKey = primaryCommittee.trim();
  const primary = lunchPeriodForCommittee(day, primaryKey);
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

    const cmp = lunchPeriodForCommittee(day, key);
    if (!cmp) continue;

    const overlapStartMin = Math.max(primary.startMin, cmp.startMin);
    const overlapEndMin = Math.min(primary.endMin, cmp.endMin);
    const overlapMinutes = Math.max(0, overlapEndMin - overlapStartMin);

    results.push({
      day,
      compareCommittee: key,
      primaryStart: primary.start,
      primaryEnd: primary.end,
      primaryEat: primary.eat,
      primaryChill: primary.chill,
      compareStart: cmp.start,
      compareEnd: cmp.end,
      compareEat: cmp.eat,
      compareChill: cmp.chill,
      overlapStart: overlapMinutes > 0 ? minutesToHHMM(overlapStartMin) : null,
      overlapEnd: overlapMinutes > 0 ? minutesToHHMM(overlapEndMin) : null,
      overlapMinutes,
    });
  }

  return results.sort((a, b) => b.overlapMinutes - a.overlapMinutes);
}
