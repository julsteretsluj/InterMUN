import {
  DEFAULT_TEXT_SIZE_STEP,
  DYSLEXIC_FONT_STORAGE_KEY,
  DEFAULT_THEME_HUE,
  LEGACY_THEME_HUE_CLEANUP,
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_MIN,
  TEXT_SIZE_STORAGE_KEY,
  THEME_HUES,
  THEME_HUE_STORAGE_KEY,
  THEME_STORAGE_KEY,
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

export function clampTextSizeStep(n: number): TextSizeStep {
  const r = Math.round(n);
  const c = Math.max(TEXT_SIZE_STEP_MIN, Math.min(TEXT_SIZE_STEP_MAX, r));
  return c as TextSizeStep;
}

/** Migrate legacy `"small"` | `"medium"` | `"large"` and numeric `"0"`–`"6"`. */
export function parseTextSizeFromStorage(raw: string | null): TextSizeStep {
  if (raw === "small") return 0;
  if (raw === "medium") return 3;
  if (raw === "large") return 6;
  const n = parseInt(raw ?? "", 10);
  if (!Number.isNaN(n)) return clampTextSizeStep(n);
  return DEFAULT_TEXT_SIZE_STEP;
}

export function readTextSizeFromStorage(): TextSizeStep {
  if (typeof window === "undefined") return DEFAULT_TEXT_SIZE_STEP;
  return parseTextSizeFromStorage(localStorage.getItem(TEXT_SIZE_STORAGE_KEY));
}

const LEGACY_TEXT_SIZE_CLASSES = ["text-size-small", "text-size-large"] as const;

function textScaleClasses(): string[] {
  const out: string[] = [];
  for (let i = TEXT_SIZE_STEP_MIN; i <= TEXT_SIZE_STEP_MAX; i++) {
    out.push(`text-scale-${i}`);
  }
  return out;
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

export function applyTextSizeToDocument(step: TextSizeStep) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const c of textScaleClasses()) {
    root.classList.remove(c);
  }
  for (const c of LEGACY_TEXT_SIZE_CLASSES) {
    root.classList.remove(c);
  }
  root.classList.add(`text-scale-${step}`);
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
