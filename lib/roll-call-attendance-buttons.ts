import type { RollAttendance } from "@/lib/roll-attendance";

export type RollAttendanceButtonConfig = {
  value: RollAttendance;
  labelKey: "rollPresent" | "rollPresentVoting" | "rollAbsent";
  titleKey: "rollPresentTitle" | "rollPresentVotingTitle" | "rollAbsent";
  activeClass: string;
  inactiveClass: string;
};

/** Shared roll-call status buttons (chair session floor + marketing preview). */
export const ROLL_ATTENDANCE_BUTTONS: RollAttendanceButtonConfig[] = [
  {
    value: "present_abstain",
    labelKey: "rollPresent",
    titleKey: "rollPresentTitle",
    activeClass:
      "border-amber-500/70 bg-amber-400/30 text-amber-950 shadow-sm dark:bg-amber-400/25 dark:text-amber-100",
    inactiveClass:
      "border-amber-500/25 bg-amber-400/5 text-amber-800/90 hover:bg-amber-400/15 dark:text-amber-200/80",
  },
  {
    value: "present_voting",
    labelKey: "rollPresentVoting",
    titleKey: "rollPresentVotingTitle",
    activeClass:
      "border-emerald-500/70 bg-emerald-400/30 text-emerald-950 shadow-sm dark:bg-emerald-400/25 dark:text-emerald-100",
    inactiveClass:
      "border-emerald-500/25 bg-emerald-400/5 text-emerald-800/90 hover:bg-emerald-400/15 dark:text-emerald-200/80",
  },
  {
    value: "absent",
    labelKey: "rollAbsent",
    titleKey: "rollAbsent",
    activeClass:
      "border-rose-500/70 bg-rose-400/30 text-rose-950 shadow-sm dark:bg-rose-400/25 dark:text-rose-100",
    inactiveClass:
      "border-rose-500/25 bg-rose-400/5 text-rose-800/90 hover:bg-rose-400/15 dark:text-rose-200/80",
  },
];

export const SESSION_SURFACE_CARD =
  "rounded-xl border border-white/15 bg-black/25 p-4 text-brand-navy shadow-sm backdrop-blur-sm";
