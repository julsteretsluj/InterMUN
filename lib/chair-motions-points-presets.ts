/**
 * Preset lines aligned with [SEAMUNs Chair Room → Motions & Points](https://thedashboard.seamuns.site/chair)
 * “Preset options” (motion vs point kinds match the dashboard).
 */

export type MotionsPointsPreset = {
  id: string;
  kind: "motion" | "point";
};

export const CHAIR_MOTIONS_POINTS_PRESETS: MotionsPointsPreset[] = [
  {
    id: "moderated-caucus",
    kind: "motion",
  },
  {
    id: "unmoderated-caucus",
    kind: "motion",
  },
  {
    id: "open-speaker-list",
    kind: "motion",
  },
  {
    id: "close-speaker-list",
    kind: "motion",
  },
  {
    id: "point-of-order",
    kind: "point",
  },
  {
    id: "point-of-information",
    kind: "point",
  },
  {
    id: "point-of-personal-privilege",
    kind: "point",
  },
];
