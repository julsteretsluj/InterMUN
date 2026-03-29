export const THEME_STORAGE_KEY = "intermun-theme";
export const THEME_HUE_STORAGE_KEY = "intermun-theme-hue";

export type ThemePreference = "light" | "dark";

export const THEME_HUES = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "neutral",
] as const;

export type ThemeHue = (typeof THEME_HUES)[number];

/** Default matches legacy InterMUN accent (green). */
export const DEFAULT_THEME_HUE: ThemeHue = "green";
