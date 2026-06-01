export const THEME_STORAGE_KEY = "intermun-theme";
export const THEME_HUE_STORAGE_KEY = "intermun-theme-hue";
export const DYSLEXIC_FONT_STORAGE_KEY = "intermun-dyslexic-font";
export const COLORBLIND_MODE_STORAGE_KEY = "intermun-colorblind-mode";
export const TEXT_SIZE_STORAGE_KEY = "intermun-text-size";

/**
 * Root `html` font-size step in percentage points from default.
 * -50 => 50% of base, 0 => default (100%), +50 => 150% of base.
 */
export const TEXT_SIZE_STEP_MIN = -50;
export const TEXT_SIZE_STEP_MAX = 50;
export const DEFAULT_TEXT_SIZE_STEP = 0;

export type TextSizeStep = number;

/** Root font-size % for current step. */
export function textSizeStepToRootPct(step: number): number {
  return 100 + step;
}

export type ThemePreference = "light" | "dark";

export const THEME_HUES = [
  "blue",
  "red",
  "orange",
  "yellow",
  "purple",
  "pink",
  "neutral",
] as const;

export type ThemeHue = (typeof THEME_HUES)[number];

/** Default accent (explicit `theme-blue` rules). */
export const DEFAULT_THEME_HUE: ThemeHue = "blue";

/** Removed from picker; strip `theme-green` from `<html>` on apply (legacy stored key). */
export const LEGACY_THEME_HUE_CLEANUP = ["green"] as const;
