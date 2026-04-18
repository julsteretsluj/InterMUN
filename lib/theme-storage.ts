export const THEME_STORAGE_KEY = "intermun-theme";
export const THEME_HUE_STORAGE_KEY = "intermun-theme-hue";
export const DYSLEXIC_FONT_STORAGE_KEY = "intermun-dyslexic-font";

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
