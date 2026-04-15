import {
  DYSLEXIC_FONT_STORAGE_KEY,
  DEFAULT_THEME_HUE,
  THEME_HUES,
  THEME_HUE_STORAGE_KEY,
  THEME_STORAGE_KEY,
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

export function applyThemeToDocument(mode: ThemePreference, hue: ThemeHue) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  for (const h of THEME_HUES) {
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

export function persistAndApplyTheme(mode: ThemePreference, hue: ThemeHue) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  localStorage.setItem(THEME_HUE_STORAGE_KEY, hue);
  applyThemeToDocument(mode, hue);
}

export function persistAndApplyDyslexicFont(enabled: boolean) {
  localStorage.setItem(DYSLEXIC_FONT_STORAGE_KEY, enabled ? "1" : "0");
  applyDyslexicFontToDocument(enabled);
}
