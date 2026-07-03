/**
 * Preset committee sessions derived from the locked SEAMUN I 2027 timetable.
 * These turn the read-only schedule's `category: "session"` blocks into
 * one-click "start" presets for chairs (title + duration prefilled).
 */

import { buildSeamunCommitteeDayBlocks } from "@/lib/seamun-i-2027-advisor-schedules";
import { timeToMinutes } from "@/lib/seamun-i-2027-locked-schedule";

export type SeamunPresetSession = {
  /** Conference day the block belongs to (1 or 2). */
  day: 1 | 2;
  /** Wall-clock start, "HH:MM" (local to the venue). */
  start: string;
  /** Wall-clock end, "HH:MM". */
  end: string;
  title: string;
  /** Block length in seconds (minimum 60). */
  durationSeconds: number;
};

/** Schedule points chairs are reminded about (no session to start). */
export type SeamunScheduleMilestoneKind = "resolutions_due" | "closing_ceremony";

export type SeamunScheduleMilestone = {
  day: 1 | 2;
  /** Wall-clock deadline / start, "HH:MM" (local to the venue). */
  start: string;
  title: string;
  kind: SeamunScheduleMilestoneKind;
};

const DAYS: (1 | 2)[] = [1, 2];

/**
 * Committee-specific resolutions-due exceptions.
 *
 * The locked timetable puts a shared "Resolutions Due" break in every schedule
 * group on both days, but not every chamber submits resolutions on that cadence:
 *  - Press Corps produces coverage, not resolutions — no resolutions-due reminders.
 *  - UNSC drafts a single resolution, submitted on day 2 only.
 */
const COMMITTEES_WITHOUT_RESOLUTIONS = new Set<string>(["Press Corps"]);
const RESOLUTIONS_DUE_ONLY_ON_DAY: Record<string, 1 | 2> = { UNSC: 2 };

/** Whether a committee should be reminded about a resolutions-due deadline on this day. */
function committeeHasResolutionsDue(committee: string, day: 1 | 2): boolean {
  if (COMMITTEES_WITHOUT_RESOLUTIONS.has(committee)) return false;
  const onlyDay = RESOLUTIONS_DUE_ONLY_ON_DAY[committee];
  if (onlyDay != null) return day === onlyDay;
  return true;
}

/**
 * Build the ordered list of session presets for a committee across both days.
 * Returns an empty list for committees not on the locked timetable.
 */
export function buildSeamunPresetSessionsForCommittee(
  committee: string | null | undefined
): SeamunPresetSession[] {
  const key = (committee ?? "").trim();
  if (!key) return [];

  const presets: SeamunPresetSession[] = [];
  for (const day of DAYS) {
    for (const block of buildSeamunCommitteeDayBlocks(day, key)) {
      if (block.category !== "session") continue;
      const minutes = timeToMinutes(block.end) - timeToMinutes(block.start);
      presets.push({
        day,
        start: block.start,
        end: block.end,
        title: block.title,
        durationSeconds: Math.max(60, minutes * 60),
      });
    }
  }
  return presets;
}

/**
 * Build reminder milestones (resolutions-due deadline and closing ceremony)
 * for a committee across both days. Deadlines use the block's start time.
 */
export function buildSeamunScheduleMilestonesForCommittee(
  committee: string | null | undefined
): SeamunScheduleMilestone[] {
  const key = (committee ?? "").trim();
  if (!key) return [];

  const milestones: SeamunScheduleMilestone[] = [];
  for (const day of DAYS) {
    for (const block of buildSeamunCommitteeDayBlocks(day, key)) {
      if (/resolutions?\s+due/i.test(block.title)) {
        if (committeeHasResolutionsDue(key, day)) {
          milestones.push({ day, start: block.start, title: block.title, kind: "resolutions_due" });
        }
      } else if (block.category === "ceremony" && /closing/i.test(block.title)) {
        milestones.push({ day, start: block.start, title: block.title, kind: "closing_ceremony" });
      }
    }
  }
  return milestones;
}
