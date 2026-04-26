// Best-effort mapping from allocation labels stored in `allocations.country`
// to an emoji. Countries get national flags; staff seats get role emojis.

const FALLBACK = "📌";
const CHAIR_EMOJI = "🪑";
const SMT_EMOJI = "⭐";
const PERSON_EMOJI = "🧑";
const PRESS_EMOJI = "📰";
const ORG_EMOJI = "🏛️";

// Seeded allocation country names appear in English (e.g. "Costa Rica").
// Keep this small; add entries as you notice mismatches.
export const NAME_TO_FLAG_EMOJI: Record<string, string> = {
  "Afghanistan": "🇦🇫",
  "Bahrain": "🇧🇭",
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Bangladesh": "🇧🇩",
  "Bolivia": "🇧🇴",
  "Brazil": "🇧🇷",
  "Canada": "🇨🇦",
  "Cambodia": "🇰🇭",
  "Chile": "🇨🇱",
  "China": "🇨🇳",
  "Colombia": "🇨🇴",
  "Costa Rica": "🇨🇷",
  "Cuba": "🇨🇺",
  "Democratic Republic of the Congo": "🇨🇩",
  "Denmark": "🇩🇰",
  "Dominican Republic": "🇩🇴",
  "Egypt": "🇪🇬",
  "El Salvador": "🇸🇻",
  "Eritrea": "🇪🇷",
  "Estonia": "🇪🇪",
  "Ethiopia": "🇪🇹",
  "Finland": "🇫🇮",
  "France": "🇫🇷",
  "Georgia": "🇬🇪",
  "Germany": "🇩🇪",
  "Greece": "🇬🇷",
  "Guatemala": "🇬🇹",
  "Hungary": "🇭🇺",
  "Iceland": "🇮🇸",
  "India": "🇮🇳",
  "Indonesia": "🇮🇩",
  "Iran": "🇮🇷",
  "Ireland": "🇮🇪",
  "Israel": "🇮🇱",
  "Italy": "🇮🇹",
  "Jamaica": "🇯🇲",
  "Japan": "🇯🇵",
  "Jordan": "🇯🇴",
  "Kenya": "🇰🇪",
  "Laos": "🇱🇦",
  "Latvia": "🇱🇻",
  "Liberia": "🇱🇷",
  "Malta": "🇲🇹",
  "Mauritania": "🇲🇷",
  "Mexico": "🇲🇽",
  "Myanmar": "🇲🇲",
  "Netherlands": "🇳🇱",
  "Nigeria": "🇳🇬",
  "Norway": "🇳🇴",
  "Oman": "🇴🇲",
  "Pakistan": "🇵🇰",
  "Panama": "🇵🇦",
  "Philippines": "🇵🇭",
  "Poland": "🇵🇱",
  "Portugal": "🇵🇹",
  "Republic of Korea": "🇰🇷",
  "Rwanda": "🇷🇼",
  "Russia": "🇷🇺",
  "Saudi Arabia": "🇸🇦",
  "Senegal": "🇸🇳",
  "Serbia": "🇷🇸",
  "Sierra Leone": "🇸🇱",
  "Singapore": "🇸🇬",
  "Slovenia": "🇸🇮",
  "Somalia": "🇸🇴",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Switzerland": "🇨🇭",
  "Thailand": "🇹🇭",
  "Turkey": "🇹🇷",
  "Ukraine": "🇺🇦",
  "United Arab Emirates": "🇦🇪",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  "Uruguay": "🇺🇾",
  "Vietnam": "🇻🇳",
};

export function flagEmojiForCountryName(countryName: string | null | undefined) {
  if (!countryName) return FALLBACK;
  const trimmed = countryName.trim();
  // Normalize common allocation label variants from seeding spreadsheets.
  const canonical = trimmed
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace("South-Africa", "South Africa")
    .replace("Lao PDR", "Laos")
    .trim();
  const normalized = canonical.toLowerCase();

  if (normalized.includes("smt") || normalized.includes("secretariat")) {
    return SMT_EMOJI;
  }
  if (normalized.includes("chair")) {
    return CHAIR_EMOJI;
  }

  if (NAME_TO_FLAG_EMOJI[canonical]) {
    return NAME_TO_FLAG_EMOJI[canonical];
  }

  // Press/media seats in special committees.
  const pressKeywords = [
    "news",
    "times",
    "journal",
    "post",
    "reuters",
    "xinhua",
    "bbc",
    "cnn",
    "npr",
    "lancet",
    "associated press",
    "ap",
    "dw",
    "al jazeera",
    "media",
    "wiki",
  ];
  if (pressKeywords.some((k) => normalized.includes(k))) {
    return PRESS_EMOJI;
  }

  // Institutional / org seats.
  const orgKeywords = [
    "union",
    "council",
    "commission",
    "parliament",
    "government",
    "kingdom",
    "empire",
    "sultanate",
    "dynasty",
    "confederacy",
    "league",
  ];
  if (orgKeywords.some((k) => normalized.includes(k))) {
    return ORG_EMOJI;
  }

  // Otherwise treat non-country allocation labels as individual actors.
  return PERSON_EMOJI || FALLBACK;
}

