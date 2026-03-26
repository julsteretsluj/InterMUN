/**
 * Second-gate committee / room join codes: exactly 6 characters, A–Z and 0–9.
 * Format: up to 3 letters derived from the chamber label (first token(s)) + 3 digits
 * derived deterministically from the conference UUID (e.g. ECO741 for ECOSOC).
 */

export const COMMITTEE_JOIN_CODE_LENGTH = 6;

/** Reserved second-gate code for the secretariat / SMT committee row (same event as delegates). */
export const SMT_COMMITTEE_CODE = "SMT227";

const JOIN_CODE_RE = /^[A-Z0-9]{6}$/;

/** FNV-1a 32-bit — stable across Node and browser for the same string. */
export function fnv1a32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** First up to 3 A–Z letters from the chamber / committee label (e.g. ECOSOC → ECO, "UN Women" → UNW). */
export function committeeJoinCodePrefix(committee: string): string {
  const tokens = committee
    .trim()
    .split(/[\s-–—]+/)
    .filter(Boolean);
  let merged = "";
  for (const t of tokens) {
    merged += t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (merged.length >= 3) break;
  }
  if (merged.length < 3) {
    merged = (merged + "XXX").slice(0, 3);
  }
  return merged.slice(0, 3);
}

/** Deterministic 6-character code for a committee row (prefix + 3-digit suffix from conference id). */
export function generateSixCharCommitteeCode(committee: string, conferenceId: string): string {
  const prefix = committeeJoinCodePrefix(committee);
  const n = fnv1a32(conferenceId) % 1000;
  return `${prefix}${n.toString().padStart(3, "0")}`;
}

/** Normalize user input: uppercase, strip everything except A–Z0–9. */
export function normalizeCommitteeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCommitteeJoinCode(code: string): boolean {
  return JOIN_CODE_RE.test(code);
}
