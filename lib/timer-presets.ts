// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Named timer presets chairs can apply (sets duration + floor label for delegates). */

export type TimerPresetGroup = "general" | "moderated" | "unmoderated" | "consultation";

export type TimerPreset = {
  id: string;
  /** Shown next to the committee timer for delegates (e.g. GSL 60s). */
  name: string;
  totalSeconds: number;
  perSpeakerMode: boolean;
  group: TimerPresetGroup;
};

export const TIMER_PRESET_GROUPS: TimerPresetGroup[] = [
  "general",
  "moderated",
  "unmoderated",
  "consultation",
];

/** Total caucus / consultation lengths, in minutes. */
export const CAUCUS_DURATION_MINUTES = [5, 10, 15, 20, 25, 30, 35, 40, 45] as const;

/** Built-in presets that denote the General Speakers' List (chair speaker-list prompt). */
export const GSL_TIMER_PRESET_IDS = new Set<string>();

/** Presets for moderated caucus total time (chair speaker-list prompt). */
export const MODERATED_CAUCUS_TIMER_PRESET_IDS = new Set(
  CAUCUS_DURATION_MINUTES.map((minutes) => `mod-${minutes}`)
);

export function isGslTimerPresetId(id: string): boolean {
  return GSL_TIMER_PRESET_IDS.has(id);
}

export function isModeratedCaucusTimerPresetId(id: string): boolean {
  return MODERATED_CAUCUS_TIMER_PRESET_IDS.has(id);
}

/** Floor label shown to delegates (e.g. user-typed "GSL 60s"). */
export function floorLabelLooksLikeGsl(label: string): boolean {
  return /\bgsl\b/i.test(label.trim());
}

function durationPresets(
  idPrefix: "mod" | "unmod" | "consult",
  namePrefix: string,
  group: TimerPresetGroup
): TimerPreset[] {
  return CAUCUS_DURATION_MINUTES.map((minutes) => ({
    id: `${idPrefix}-${minutes}`,
    name: `${namePrefix} ${minutes}m`,
    totalSeconds: minutes * 60,
    perSpeakerMode: false,
    group,
  }));
}

export const BUILTIN_TIMER_PRESETS: TimerPreset[] = [
  { id: "timer-60", name: "60 seconds", totalSeconds: 60, perSpeakerMode: false, group: "general" },
  { id: "timer-5", name: "5 minutes", totalSeconds: 5 * 60, perSpeakerMode: false, group: "general" },
  { id: "timer-10", name: "10 minutes", totalSeconds: 10 * 60, perSpeakerMode: false, group: "general" },
  ...durationPresets("mod", "Moderated caucus", "moderated"),
  ...durationPresets("unmod", "Unmoderated caucus", "unmoderated"),
  ...durationPresets("consult", "Consultation of the whole", "consultation"),
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
