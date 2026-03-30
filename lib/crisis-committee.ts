/**
 * Crisis-style committees use incident / crisis reporting (`/report`) and crisis prep items.
 * Matches `conferences.committee` labels such as UNSC, HSC, or FWC (including "FWC - …").
 */
export function isCrisisCommittee(committee: string | null | undefined): boolean {
  const raw = (committee ?? "").trim();
  if (!raw) return false;
  const u = raw.toUpperCase().replace(/\s+/g, " ");
  return /\bFWC\b/.test(u) || /\bHSC\b/.test(u) || /\bUNSC\b/.test(u);
}
