import { normalizeCommitteeJoinCode } from "@/lib/committee-join-code";

export { SMT_COMMITTEE_CODE } from "@/lib/committee-join-code";

/** Conference / event code: letters, digits, common punctuation; spaces stripped; compared case-insensitively. */
export function normalizeEventCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Second-gate committee / room code: A–Z0–9 only (e.g. ECO741). */
export function normalizeCommitteeCode(raw: string): string {
  return normalizeCommitteeJoinCode(raw);
}
