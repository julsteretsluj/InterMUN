/** Second-gate committee code reserved for SMT / secretariat (same event as delegates). */
export const SMT_COMMITTEE_CODE = "SECRETARIAT2027";

/** Conference / event code: letters, digits, common punctuation; spaces stripped; compared case-insensitively. */
export function normalizeEventCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Committee code within an event (e.g. ECOSOC@SEAMUN): trim, uppercase; keeps @ and similar. */
export function normalizeCommitteeCode(raw: string): string {
  return raw.trim().toUpperCase();
}
