export const THEME_STORAGE_KEY = "intermun-theme";
export const THEME_HUE_STORAGE_KEY = "intermun-theme-hue";
export const DYSLEXIC_FONT_STORAGE_KEY = "intermun-dyslexic-font";
export const TEXT_SIZE_STORAGE_KEY = "intermun-text-size";

/**
 * Root `html` font-size steps (rem-based UI follows).
 * 0 = former “small”, 3 = “medium”, 6 = “large”; two interpolated steps between each pair.
 */
export const TEXT_SIZE_STEP_MIN = 0;
export const TEXT_SIZE_STEP_MAX = 6;
export const DEFAULT_TEXT_SIZE_STEP = 3;

export type TextSizeStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Approximate root font-size % for UI feedback (matches `globals.css` per-step rules). */
export const TEXT_SIZE_STEP_ROOT_PCT: Record<TextSizeStep, number> = {
  0: 93.75,
  1: 95.833,
  2: 97.917,
  3: 100,
  4: 104.167,
  5: 108.333,
  6: 112.5,
};

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
