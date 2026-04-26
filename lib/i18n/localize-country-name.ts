import { NAME_TO_FLAG_EMOJI } from "@/lib/country-flag-emoji";

const DISPLAY_NAMES_CACHE = new Map<string, Intl.DisplayNames>();

function canonicalizeCountryName(countryName: string): string {
  return countryName
    .trim()
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace("South-Africa", "South Africa")
    .replace("Lao PDR", "Laos")
    .trim();
}

function regionCodeFromFlagEmoji(flag: string): string | null {
  const chars = [...flag];
  if (chars.length !== 2) return null;
  const codePoints = chars.map((ch) => ch.codePointAt(0) ?? 0);
  const base = 0x1f1e6;
  if (!codePoints.every((cp) => cp >= base && cp <= base + 25)) return null;
  return String.fromCharCode(codePoints[0] - base + 65, codePoints[1] - base + 65);
}

function getDisplayNames(locale: string): Intl.DisplayNames | null {
  const key = locale || "en";
  const cached = DISPLAY_NAMES_CACHE.get(key);
  if (cached) return cached;
  try {
    const instance = new Intl.DisplayNames([key], { type: "region" });
    DISPLAY_NAMES_CACHE.set(key, instance);
    return instance;
  } catch {
    return null;
  }
}

export function localizeCountryName(countryName: string | null | undefined, locale: string): string {
  if (!countryName) return "";
  const canonical = canonicalizeCountryName(countryName);
  if (!canonical) return "";

  const flag = NAME_TO_FLAG_EMOJI[canonical];
  if (!flag) return canonical;

  const regionCode = regionCodeFromFlagEmoji(flag);
  if (!regionCode) return canonical;

  const displayNames = getDisplayNames(locale);
  const localized = displayNames?.of(regionCode);
  return localized?.trim() ? localized : canonical;
}
