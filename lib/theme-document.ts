import {
  DEFAULT_TEXT_SIZE,
  DYSLEXIC_FONT_STORAGE_KEY,
  DEFAULT_THEME_HUE,
  LEGACY_THEME_HUE_CLEANUP,
  TEXT_SIZE_OPTIONS,
  TEXT_SIZE_STORAGE_KEY,
  THEME_HUES,
  THEME_HUE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type TextSizePreference,
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

export function parseTextSizeFromStorage(raw: string | null): TextSizePreference {
  if (raw && (TEXT_SIZE_OPTIONS as readonly string[]).includes(raw)) return raw as TextSizePreference;
  return DEFAULT_TEXT_SIZE;
}

export function readTextSizeFromStorage(): TextSizePreference {
  if (typeof window === "undefined") return DEFAULT_TEXT_SIZE;
  return parseTextSizeFromStorage(localStorage.getItem(TEXT_SIZE_STORAGE_KEY));
}

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

export function applyTextSizeToDocument(size: TextSizePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("text-size-small", "text-size-large");
  if (size === "small") root.classList.add("text-size-small");
  else if (size === "large") root.classList.add("text-size-large");
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

export function persistAndApplyTextSize(size: TextSizePreference) {
  localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  applyTextSizeToDocument(size);
}
