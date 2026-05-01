/**
 * Locale-aware title case for agenda topics:
 * capitalize major words; keep minor words lowercase unless first/last.
 * For scripts without casing (e.g. CJK/Arabic/Hebrew), leaves text unchanged.
 */
const TITLE_MINOR_WORDS_BY_LOCALE_PREFIX: Record<string, Set<string>> = {
  en: new Set([
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "nor",
    "for",
    "so",
    "yet",
    "as",
    "at",
    "by",
    "in",
    "of",
    "on",
    "to",
    "up",
    "if",
    "via",
    "vs",
    "v",
  ]),
  es: new Set(["a", "al", "de", "del", "el", "la", "las", "lo", "los", "o", "u", "y", "en", "por", "para", "con"]),
  fr: new Set(["à", "au", "aux", "de", "du", "des", "le", "la", "les", "et", "ou", "en", "pour", "par", "sur", "dans"]),
  de: new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "einem", "einen", "und", "oder", "in", "im", "am", "zu", "zur", "zum", "von", "vom", "mit", "für"]),
  it: new Set(["a", "ad", "al", "alla", "alle", "agli", "allo", "da", "dal", "dalla", "dalle", "dei", "del", "della", "dello", "di", "e", "ed", "o", "od", "in", "nel", "nella", "nelle", "per", "su", "tra", "fra", "con"]),
  nl: new Set(["de", "het", "een", "en", "of", "in", "op", "van", "voor", "met", "te", "tot", "door"]),
  pt: new Set(["a", "as", "o", "os", "de", "do", "da", "dos", "das", "e", "ou", "em", "no", "na", "nos", "nas", "por", "para", "com"]),
  pl: new Set(["a", "i", "oraz", "lub", "albo", "w", "we", "na", "do", "od", "z", "ze", "o", "u", "po", "przez"]),
  tr: new Set(["ve", "veya", "ya", "ile", "için", "de", "da", "ki", "bir", "bu", "şu", "o"]),
  ru: new Set(["и", "или", "но", "а", "в", "во", "на", "по", "о", "об", "от", "до", "из", "у", "к", "ко", "с", "со", "за", "для"]),
  uk: new Set(["і", "й", "або", "але", "а", "в", "у", "на", "по", "про", "від", "до", "із", "з", "зі", "за", "для"]),
  el: new Set(["και", "ή", "το", "η", "ο", "οι", "τα", "του", "της", "των", "σε", "στο", "στη", "στις", "για", "με", "από"]),
  id: new Set(["dan", "atau", "di", "ke", "dari", "untuk", "yang"]),
  ms: new Set(["dan", "atau", "di", "ke", "dari", "untuk", "yang"]),
  sw: new Set(["na", "ya", "wa", "au", "kwa", "katika", "kutoka", "kwa", "za"]),
  mi: new Set(["te", "ki", "i", "o", "a", "me", "mo", "hei"]),
  vi: new Set(["và", "hoặc", "của", "trong", "cho", "với", "từ", "đến"]),
};

const LOCALE_PREFIXES_WITHOUT_CASE = new Set([
  "zh",
  "ja",
  "ko",
  "th",
  "ar",
  "fa",
  "he",
  "hi",
  "bn",
  "km",
  "lo",
  "my",
]);

function resolveLocalePrefix(locale: string | undefined): string {
  return (locale ?? "").toLowerCase().split("-")[0] ?? "";
}

function isLikelyNoCaseLocale(locale: string | undefined): boolean {
  return LOCALE_PREFIXES_WITHOUT_CASE.has(resolveLocalePrefix(locale));
}

function minorWordsForLocale(locale: string | undefined): Set<string> {
  const prefix = resolveLocalePrefix(locale);
  return (
    TITLE_MINOR_WORDS_BY_LOCALE_PREFIX[prefix] ??
    TITLE_MINOR_WORDS_BY_LOCALE_PREFIX.en
  );
}

function formatWordToken(
  token: string,
  isFirst: boolean,
  isLast: boolean,
  locale: string | undefined,
  minorWords: Set<string>
): string {
  let lo = 0;
  let hi = token.length;
  while (lo < hi && !/[0-9\p{L}]/u.test(token[lo]!)) lo++;
  while (hi > lo && !/[0-9\p{L}]/u.test(token[hi - 1]!)) hi--;
  if (lo >= hi) return token;

  const pre = token.slice(0, lo);
  const post = token.slice(hi);
  const core = token.slice(lo, hi);

  const letters = core.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 2 && letters === letters.toUpperCase()) {
    return token;
  }

  const pieces = core.split(/([-–—/])/);
  const rebuilt = pieces.map((seg) => {
    if (seg === "-" || seg === "–" || seg === "—" || seg === "/") return seg;
    if (!seg) return seg;
    const lower = seg.toLocaleLowerCase(locale);
    const minor = !isFirst && !isLast && minorWords.has(lower);
    if (minor) return lower;
    return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
  });

  return pre + rebuilt.join("") + post;
}

/** Apply locale-aware title case to a full topic line (single segment, no committee suffix). */
export function formatTopicTitleCase(input: string, locale: string | undefined): string {
  const trimmed = input.trim();
  if (!trimmed) return input;
  if (isLikelyNoCaseLocale(locale)) return input;
  const minorWords = minorWordsForLocale(locale);
  const words = trimmed.split(/\s+/);
  const n = words.length;
  return words
    .map((w, i) => formatWordToken(w, i === 0, i === n - 1, locale, minorWords))
    .join(" ");
}

export function applyTopicTitleCaseIfLocale(text: string, locale: string | undefined): string {
  if (!text?.trim()) return text;
  return formatTopicTitleCase(text, locale);
}
