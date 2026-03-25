/** Conference / event code: letters, digits, common punctuation; spaces stripped; compared case-insensitively. */
export function normalizeEventCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Committee code within an event (e.g. ECOSOC@SEAMUN): trim, uppercase; keeps @ and similar. */
export function normalizeCommitteeCode(raw: string): string {
  return raw.trim().toUpperCase();
}
