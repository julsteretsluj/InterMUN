export const THEME_STORAGE_KEY = "intermun-theme";
export const THEME_HUE_STORAGE_KEY = "intermun-theme-hue";
export const DYSLEXIC_FONT_STORAGE_KEY = "intermun-dyslexic-font";

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

/** Default accent; `theme-green` has no CSS override — base palette is SEAMUN logo blues. */
export const DEFAULT_THEME_HUE: ThemeHue = "green";
