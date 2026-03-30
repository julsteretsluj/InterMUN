/**
 * Preset lines aligned with [SEAMUNs Chair Room → Motions & Points](https://thedashboard.seamuns.site/chair)
 * “Preset options” (motion vs point kinds match the dashboard).
 */

export type MotionsPointsPreset = {
  id: string;
  kind: "motion" | "point";
  /** Short label on the preset button */
  buttonLabel: string;
  /** Full line stored in the log */
  logText: string;
};

export const CHAIR_MOTIONS_POINTS_PRESETS: MotionsPointsPreset[] = [
  {
    id: "moderated-caucus",
    kind: "motion",
    buttonLabel: "Moderated caucus",
    logText: "Motion for a Moderated Caucus",
  },
  {
    id: "unmoderated-caucus",
    kind: "motion",
    buttonLabel: "Unmoderated caucus",
    logText: "Motion for an Unmoderated Caucus",
  },
  {
    id: "open-speaker-list",
    kind: "motion",
    buttonLabel: "Open speaker list",
    logText: "Motion to Open the Speakers List",
  },
  {
    id: "close-speaker-list",
    kind: "motion",
    buttonLabel: "Close speaker list",
    logText: "Motion to Close the Speakers List",
  },
  {
    id: "point-of-order",
    kind: "point",
    buttonLabel: "Point of order",
    logText: "Point of Order",
  },
  {
    id: "point-of-information",
    kind: "point",
    buttonLabel: "Point of information",
    logText: "Point of Information",
  },
  {
    id: "point-of-personal-privilege",
    kind: "point",
    buttonLabel: "Point of personal privilege",
    logText: "Point of Personal Privilege",
  },
];
