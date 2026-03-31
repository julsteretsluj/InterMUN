// Best-effort mapping from allocation labels stored in `allocations.country`
// to an emoji. Countries get national flags; staff seats get role emojis.

const FALLBACK = "🌍";
const CHAIR_EMOJI = "🪑";
const SMT_EMOJI = "⭐";

// Seeded allocation country names appear in English (e.g. "Costa Rica").
// Keep this small; add entries as you notice mismatches.
const NAME_TO_FLAG_EMOJI: Record<string, string> = {
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Bangladesh": "🇧🇩",
  "Brazil": "🇧🇷",
  "Canada": "🇨🇦",
  "China": "🇨🇳",
  "Costa Rica": "🇨🇷",
  "Cuba": "🇨🇺",
  "Ethiopia": "🇪🇹",
  "Finland": "🇫🇮",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "India": "🇮🇳",
  "Indonesia": "🇮🇩",
  "Israel": "🇮🇱",
  "Italy": "🇮🇹",
  "Japan": "🇯🇵",
  "Mexico": "🇲🇽",
  "Nigeria": "🇳🇬",
  "Norway": "🇳🇴",
};

export function flagEmojiForCountryName(countryName: string | null | undefined) {
  if (!countryName) return FALLBACK;
  const trimmed = countryName.trim();
  const normalized = trimmed.toLowerCase();

  if (normalized.includes("smt") || normalized.includes("secretariat")) {
    return SMT_EMOJI;
  }
  if (normalized.includes("chair")) {
    return CHAIR_EMOJI;
  }

  return NAME_TO_FLAG_EMOJI[trimmed] ?? FALLBACK;
}

