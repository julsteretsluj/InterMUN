/** Named timer presets chairs can apply (sets duration + floor label for delegates). */

export type TimerPreset = {
  id: string;
  /** Shown next to the committee timer for delegates (e.g. GSL 60s). */
  name: string;
  totalSeconds: number;
  perSpeakerMode: boolean;
};

export const BUILTIN_TIMER_PRESETS: TimerPreset[] = [
  { id: "gsl-45", name: "GSL 45s", totalSeconds: 45, perSpeakerMode: false },
  { id: "gsl-60", name: "GSL 60s", totalSeconds: 60, perSpeakerMode: false },
  { id: "gsl-90", name: "GSL 90s", totalSeconds: 90, perSpeakerMode: false },
  { id: "yield-30", name: "Yield / right of reply 30s", totalSeconds: 30, perSpeakerMode: false },
  { id: "point-60", name: "Point of order 60s", totalSeconds: 60, perSpeakerMode: false },
  { id: "mod-3", name: "Moderated caucus 3m (per speaker)", totalSeconds: 180, perSpeakerMode: true },
  { id: "mod-5", name: "Moderated caucus 5m (per speaker)", totalSeconds: 300, perSpeakerMode: true },
  { id: "mod-10", name: "Moderated caucus 10m (per speaker)", totalSeconds: 600, perSpeakerMode: true },
];

export function presetToTimerFields(p: TimerPreset): {
  floorLabel: string;
  totalM: string;
  totalS: string;
  leftM: string;
  leftS: string;
  perSpeakerMode: boolean;
} {
  const t = Math.max(1, p.totalSeconds);
  return {
    floorLabel: p.name,
    totalM: String(Math.floor(t / 60)),
    totalS: String(t % 60),
    leftM: String(Math.floor(t / 60)),
    leftS: String(t % 60),
    perSpeakerMode: p.perSpeakerMode,
  };
}
