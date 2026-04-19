/** Minimum characters for delegate chair feedback evidence (server + client). */
export const DELEGATE_CHAIR_EVIDENCE_MIN_LEN = 24;

export function uniqueSuggestionStrings(raw: string[], maxItems: number, maxChars = 220): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = s.trim();
    if (t.length < 12) continue;
    const key = t.slice(0, 96).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.length > maxChars ? `${t.slice(0, maxChars - 1)}…` : t);
    if (out.length >= maxItems) break;
  }
  return out;
}
