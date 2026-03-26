// Best-effort mapping from country name strings stored in `allocations.country`
// to a flag emoji. If we can't match a country, we fall back to a generic flag.

const FALLBACK = "🏳️";

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
  return NAME_TO_FLAG_EMOJI[trimmed] ?? FALLBACK;
}

