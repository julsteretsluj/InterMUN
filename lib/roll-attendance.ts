/** Matches SEAMUNs roll-call cycle: Absent → Present (may abstain) → Present and voting → Absent. */

export type RollAttendance = "absent" | "present_abstain" | "present_voting";

export const ROLL_ATTENDANCE_CYCLE: RollAttendance[] = [
  "absent",
  "present_abstain",
  "present_voting",
];

export function parseRollAttendance(raw: string | null | undefined): RollAttendance | null {
  if (raw === "absent" || raw === "present_abstain" || raw === "present_voting") return raw;
  return null;
}

export function nextRollAttendance(current: RollAttendance): RollAttendance {
  const i = ROLL_ATTENDANCE_CYCLE.indexOf(current);
  const idx = i < 0 ? 0 : (i + 1) % ROLL_ATTENDANCE_CYCLE.length;
  return ROLL_ATTENDANCE_CYCLE[idx]!;
}

export function rollAttendanceShortLabel(a: RollAttendance): string {
  switch (a) {
    case "absent":
      return "Absent";
    case "present_abstain":
      return "Present (may abstain)";
    case "present_voting":
      return "Present and voting";
  }
}

/** Line used next to recorded votes (chair session). */
export function rollAttendanceRollLabel(a: RollAttendance | undefined): string {
  if (!a) return "— (roll)";
  switch (a) {
    case "absent":
      return "Absent (roll)";
    case "present_abstain":
      return "Present — may abstain (roll)";
    case "present_voting":
      return "Present and voting (roll)";
    default:
      return "— (roll)";
  }
}
