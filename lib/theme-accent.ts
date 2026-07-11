// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import {
  clamp,
  hexToHsb,
  hsbToHex,
  parseHexColor,
  themeHueToHex,
} from "@/lib/apple-color-picker";
import {
  DEFAULT_THEME_HUE,
  THEME_HUES,
  type ThemeHue,
  type ThemePreference,
} from "@/lib/theme-storage";

export type ThemeAccentPair = { accent: string; accentBright: string };

export function normalizeAccentHex(raw: string | null | undefined): string {
  return parseHexColor(raw ?? "") ?? themeHueToHex(DEFAULT_THEME_HUE);
}

export function parseThemeHueFromStorage(raw: string | null): ThemeHue | null {
  if (raw && (THEME_HUES as readonly string[]).includes(raw)) return raw as ThemeHue;
  return null;
}

/** Map a stored user pick to UI accent tokens for light or dark appearance. */
export function deriveThemeAccentPair(hex: string, mode: ThemePreference): ThemeAccentPair {
  const parsed = normalizeAccentHex(hex);
  const { h, s, b } = hexToHsb(parsed);

  if (s < 12) {
    return mode === "dark"
      ? { accent: "#d1d1d6", accentBright: "#ebebf0" }
      : { accent: "#3a3a3c", accentBright: "#636366" };
  }

  if (mode === "dark") {
    return {
      accent: hsbToHex(h, clamp(s, 42, 100), clamp(b, 52, 82)),
      accentBright: hsbToHex(h, clamp(s * 0.88, 32, 100), clamp(b + 16, 68, 94)),
    };
  }

  return {
    accent: hsbToHex(h, clamp(s, 48, 100), clamp(b * 0.52, 26, 54)),
    accentBright: hsbToHex(h, clamp(s * 0.92, 36, 100), clamp(Math.max(b, 50) * 0.72, 42, 70)),
  };
}

export function accentPairToCssVars(pair: ThemeAccentPair): Record<string, string> {
  return {
    "--accent": pair.accent,
    "--accent-bright": pair.accentBright,
    "--brand-accent": pair.accent,
    "--brand-accent-bright": pair.accentBright,
    "--gold-text-bright": pair.accentBright,
    "--brand-gold-text": pair.accentBright,
    "--gold-text": `color-mix(in srgb, ${pair.accent} 88%, var(--color-text))`,
  };
}

export function applyAccentCssVars(root: HTMLElement, pair: ThemeAccentPair) {
  const vars = accentPairToCssVars(pair);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function clearAccentCssVars(root: HTMLElement) {
  const keys = [
    "--accent",
    "--accent-bright",
    "--brand-accent",
    "--brand-accent-bright",
    "--gold-text-bright",
    "--brand-gold-text",
    "--gold-text",
  ];
  for (const key of keys) {
    root.style.removeProperty(key);
  }
}
