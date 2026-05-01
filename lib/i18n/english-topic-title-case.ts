/**
 * AP-style English title case: capitalize major words; lowercase articles,
 * short conjunctions, and short prepositions unless first or last word.
 */
const EN_TITLE_MINOR_WORDS = new Set([
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
]);

function formatWordToken(token: string, isFirst: boolean, isLast: boolean): string {
  let lo = 0;
  let hi = token.length;
  while (lo < hi && !/[A-Za-zÀ-ÿ0-9]/.test(token[lo]!)) lo++;
  while (hi > lo && !/[A-Za-zÀ-ÿ0-9]/.test(token[hi - 1]!)) hi--;
  if (lo >= hi) return token;

  const pre = token.slice(0, lo);
  const post = token.slice(hi);
  const core = token.slice(lo, hi);

  const letters = core.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 2 && letters === letters.toUpperCase()) {
    return token;
  }

  const pieces = core.split(/([-–—/])/);
  const rebuilt = pieces.map((seg) => {
    if (seg === "-" || seg === "–" || seg === "—" || seg === "/") return seg;
    if (!seg) return seg;
    const lower = seg.toLowerCase();
    const minor = !isFirst && !isLast && EN_TITLE_MINOR_WORDS.has(lower);
    if (minor) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return pre + rebuilt.join("") + post;
}

/** Apply English title case to a full topic line (single segment, no committee suffix). */
export function formatEnglishTopicTitleCase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return input;
  const words = trimmed.split(/\s+/);
  const n = words.length;
  return words.map((w, i) => formatWordToken(w, i === 0, i === n - 1)).join(" ");
}

export function applyEnglishTopicTitleCaseIfLocale(text: string, locale: string | undefined): string {
  if (!text?.trim()) return text;
  if (!locale?.toLowerCase().startsWith("en")) return text;
  return formatEnglishTopicTitleCase(text);
}
