// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const THEME_STORAGE_KEY = "intermun-theme";
/** User-selected accent swatch (#rrggbb) — full spectrum, not limited to presets. */
export const THEME_ACCENT_STORAGE_KEY = "intermun-theme-accent";
/** Legacy preset key — migrated to `THEME_ACCENT_STORAGE_KEY` on read. */
export const THEME_HUE_STORAGE_KEY = "intermun-theme-hue";
export const DYSLEXIC_FONT_STORAGE_KEY = "intermun-dyslexic-font";
export const COLORBLIND_MODE_STORAGE_KEY = "intermun-colorblind-mode";
export const COLORBLIND_TYPE_STORAGE_KEY = "intermun-colorblind-type";
export const TEXT_SIZE_STORAGE_KEY = "intermun-text-size";

/** Colour-vision deficiency corrected by the global daltonization filter. */
export const COLORBLIND_TYPES = ["deuteranopia", "protanopia", "tritanopia"] as const;
export type ColorblindType = (typeof COLORBLIND_TYPES)[number];
export const DEFAULT_COLORBLIND_TYPE: ColorblindType = "deuteranopia";

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
  "green",
  "red",
  "orange",
  "yellow",
  "purple",
  "pink",
  "neutral",
] as const;

export type ThemeHue = (typeof THEME_HUES)[number];

/** Brand default accent (Apple blue — `theme-blue` rules). */
export const DEFAULT_THEME_HUE: ThemeHue = "blue";

/** Hue keys removed from the picker but still stripped from `<html>` on apply. */
export const LEGACY_THEME_HUE_CLEANUP = [] as const;
