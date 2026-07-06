// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import {
  DEFAULT_TEXT_SIZE_STEP,
  DYSLEXIC_FONT_STORAGE_KEY,
  COLORBLIND_MODE_STORAGE_KEY,
  COLORBLIND_TYPE_STORAGE_KEY,
  COLORBLIND_TYPES,
  DEFAULT_COLORBLIND_TYPE,
  DEFAULT_THEME_HUE,
  LEGACY_THEME_HUE_CLEANUP,
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_MIN,
  TEXT_SIZE_STORAGE_KEY,
  THEME_HUES,
  THEME_HUE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ColorblindType,
  type TextSizeStep,
  type ThemeHue,
  type ThemePreference,
} from "@/lib/theme-storage";

export function parseHueFromStorage(raw: string | null): ThemeHue {
  if (raw && (THEME_HUES as readonly string[]).includes(raw)) return raw as ThemeHue;
  return DEFAULT_THEME_HUE;
}

export function readThemeFromStorage(): { mode: ThemePreference; hue: ThemeHue } {
  if (typeof window === "undefined") {
    return { mode: "light", hue: DEFAULT_THEME_HUE };
  }
  const mode: ThemePreference = localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  const hue = parseHueFromStorage(localStorage.getItem(THEME_HUE_STORAGE_KEY));
  return { mode, hue };
}

export function readDyslexicFontFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DYSLEXIC_FONT_STORAGE_KEY) === "1";
}

export function readColorblindModeFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COLORBLIND_MODE_STORAGE_KEY) === "1";
}

export function parseColorblindType(raw: string | null): ColorblindType {
  if (raw && (COLORBLIND_TYPES as readonly string[]).includes(raw)) {
    return raw as ColorblindType;
  }
  return DEFAULT_COLORBLIND_TYPE;
}

export function readColorblindTypeFromStorage(): ColorblindType {
  if (typeof window === "undefined") return DEFAULT_COLORBLIND_TYPE;
  return parseColorblindType(localStorage.getItem(COLORBLIND_TYPE_STORAGE_KEY));
}

export function applyColorblindModeToDocument(enabled: boolean, type?: ColorblindType) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const cbType = type ?? readColorblindTypeFromStorage();
  if (enabled) {
    root.classList.add("colorblind-mode");
    root.setAttribute("data-cb-filter", cbType);
    root.style.filter = `url(#cb-filter-${cbType})`;
  } else {
    root.classList.remove("colorblind-mode");
    root.removeAttribute("data-cb-filter");
    root.style.filter = "";
  }
}

export function persistAndApplyColorblindMode(enabled: boolean, type?: ColorblindType) {
  localStorage.setItem(COLORBLIND_MODE_STORAGE_KEY, enabled ? "1" : "0");
  if (type) localStorage.setItem(COLORBLIND_TYPE_STORAGE_KEY, type);
  applyColorblindModeToDocument(enabled, type);
}

export function persistAndApplyColorblindType(type: ColorblindType) {
  localStorage.setItem(COLORBLIND_TYPE_STORAGE_KEY, type);
  // Only re-applies the filter if the mode is currently on.
  const enabled = readColorblindModeFromStorage();
  applyColorblindModeToDocument(enabled, type);
}

export function clampTextSizeStep(n: number): TextSizeStep {
  const r = Math.round(n);
  const c = Math.max(TEXT_SIZE_STEP_MIN, Math.min(TEXT_SIZE_STEP_MAX, r));
  return c as TextSizeStep;
}

/** Migrate legacy `"small"` | `"medium"` | `"large"` and numeric `"0"`–`"6"`. */
export function parseTextSizeFromStorage(raw: string | null): TextSizeStep {
  if (raw === "small") return -6;
  if (raw === "medium") return 0;
  if (raw === "large") return 13;
  // Legacy numeric presets 0..6 from previous slider model.
  if (raw === "0") return -6;
  if (raw === "1") return -4;
  if (raw === "2") return -2;
  if (raw === "3") return 0;
  if (raw === "4") return 4;
  if (raw === "5") return 8;
  if (raw === "6") return 13;
  const n = parseInt(raw ?? "", 10);
  if (!Number.isNaN(n)) return clampTextSizeStep(n);
  return DEFAULT_TEXT_SIZE_STEP;
}

export function readTextSizeFromStorage(): TextSizeStep {
  if (typeof window === "undefined") return DEFAULT_TEXT_SIZE_STEP;
  return parseTextSizeFromStorage(localStorage.getItem(TEXT_SIZE_STORAGE_KEY));
}

const LEGACY_TEXT_SIZE_CLASSES = ["text-size-small", "text-size-large"] as const;

export function applyThemeToDocument(mode: ThemePreference, hue: ThemeHue) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  for (const h of THEME_HUES) {
    root.classList.remove(`theme-${h}`);
  }
  for (const h of LEGACY_THEME_HUE_CLEANUP) {
    root.classList.remove(`theme-${h}`);
  }
  root.classList.add(`theme-${hue}`);
}

export function applyDyslexicFontToDocument(enabled: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (enabled) root.classList.add("dyslexic-font");
  else root.classList.remove("dyslexic-font");
}

export function applyTextSizeToDocument(step: TextSizeStep) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const c of LEGACY_TEXT_SIZE_CLASSES) {
    root.classList.remove(c);
  }
  root.style.setProperty("--text-scale-step", String(clampTextSizeStep(step)));
}

export function persistAndApplyTheme(mode: ThemePreference, hue: ThemeHue) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  localStorage.setItem(THEME_HUE_STORAGE_KEY, hue);
  applyThemeToDocument(mode, hue);
}

export function persistAndApplyDyslexicFont(enabled: boolean) {
  localStorage.setItem(DYSLEXIC_FONT_STORAGE_KEY, enabled ? "1" : "0");
  applyDyslexicFontToDocument(enabled);
}

export function persistAndApplyTextSize(step: number) {
  const s = clampTextSizeStep(step);
  localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(s));
  applyTextSizeToDocument(s);
}
