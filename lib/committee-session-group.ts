/**
 * Merge committee *sessions* (conference rows / agenda topics) that belong to the same
 * chamber within an event. Uses the same first-token rule as committee lookup tables
 * (e.g. "FWC - Stranger Things" → "FWC").
 */
export function committeeSessionGroupKey(committee: string | null | undefined): string | null {
  const raw = committee?.trim();
  if (!raw || raw.toLowerCase() === "committee") return null;
  const firstToken = raw.split(/\s*-\s*/)[0]?.trim() ?? raw;
  if (!firstToken || firstToken.toLowerCase() === "committee") return null;
  return firstToken.toUpperCase();
}
