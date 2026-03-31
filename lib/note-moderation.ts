const INAPPROPRIATE_WORD_PATTERNS: RegExp[] = [
  /\bfuck(?:ing|ed|er|ers)?\b/i,
  /\bshit(?:ty|ting|ted)?\b/i,
  /\bbitch(?:es|y)?\b/i,
  /\basshole(?:s)?\b/i,
  /\bdick(?:head|heads)?\b/i,
  /\bcunt(?:s)?\b/i,
  /\bnigg(?:er|a|as|ers)\b/i,
  /\bfag(?:got|gots)?\b/i,
  /\bretard(?:ed|s)?\b/i,
  /\bwhore(?:s)?\b/i,
];

export function detectInappropriateTerms(text: string | null | undefined): string[] {
  const content = String(text ?? "");
  if (!content.trim()) return [];

  const matches = new Set<string>();
  for (const pattern of INAPPROPRIATE_WORD_PATTERNS) {
    const found = content.match(pattern);
    if (found?.[0]) matches.add(found[0].toLowerCase());
  }
  return Array.from(matches);
}

