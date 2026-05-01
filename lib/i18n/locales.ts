export const LOCALE_COOKIE_NAME = "intermun-locale";

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "pt-BR",
  "it",
  "nl",
  "ru",
  "pl",
  "uk",
  "el",
  "tr",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "vi",
  "th",
  "id",
  "hi",
  "bn",
  "ar",
  "fa",
  "he",
  "sw",
  "mi",
  "km",
  "lo",
  "my",
  "ms",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const RTL_LOCALES = new Set<AppLocale>(["ar", "fa", "he"]);

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English (English)",
  es: "Español (Spanish)",
  fr: "Français (French)",
  de: "Deutsch (German)",
  pt: "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
  it: "Italiano (Italian)",
  nl: "Nederlands (Dutch)",
  ru: "Русский (Russian)",
  pl: "Polski (Polish)",
  uk: "Українська (Ukrainian)",
  el: "Ελληνικά (Greek)",
  tr: "Türkçe (Turkish)",
  "zh-CN": "简体中文 (Chinese, Simplified)",
  "zh-TW": "繁體中文 (Chinese, Traditional)",
  ja: "日本語 (Japanese)",
  ko: "한국어 (Korean)",
  vi: "Tiếng Việt (Vietnamese)",
  th: "ไทย (Thai)",
  id: "Bahasa Indonesia (Indonesian)",
  hi: "हिन्दी (Hindi)",
  bn: "বাংলা (Bengali)",
  ar: "العربية (Arabic)",
  fa: "فارسی (Persian)",
  he: "עברית (Hebrew)",
  sw: "Kiswahili (Swahili)",
  mi: "Te Reo Māori (Māori)",
  km: "ភាសាខ្មែរ (Khmer/Cambodian)",
  lo: "ລາວ (Lao)",
  my: "မြန်မာ (Burmese)",
  ms: "Bahasa Melayu (Malay)",
};

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes((value ?? "") as AppLocale);
}

export function resolveLocale(value: string | null | undefined): AppLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeDirection(locale: string | null | undefined): "ltr" | "rtl" {
  return RTL_LOCALES.has(resolveLocale(locale)) ? "rtl" : "ltr";
}
