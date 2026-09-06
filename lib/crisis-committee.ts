// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Crisis-style committees use `/crisis` notes & prompts (chair) and `/crisis-slides`.
 * Matches `conferences.committee` labels such as UNSC or FWC.
 */
export function isCrisisCommittee(committee: string | null | undefined): boolean {
  const raw = (committee ?? "").trim();
  if (!raw) return false;
  const u = raw.toUpperCase().replace(/\s+/g, " ");
  return /\bFWC\b/.test(u) || /\bUNSC\b/.test(u);
}

/** FWC (e.g. “FWC - Stranger Things”) is the only chamber that shows political group on the matrix. */
export function isFwcCommittee(committee: string | null | undefined): boolean {
  const raw = (committee ?? "").trim();
  if (!raw) return false;
  return /\bFWC\b/.test(raw.toUpperCase().replace(/\s+/g, " "));
}

export const FWC_ONLY_ACTION_ERROR = "This action is only available in FWC.";

/**
 * Gate FWC-only actions and routes. Uses the same `conferences.committee` match as
 * `isFwcCommittee` — UNSC and other crisis chambers must not pass.
 */
export function assertFwcCommittee(
  committee: string | null | undefined
): asserts committee is string {
  if (!isFwcCommittee(committee)) {
    throw new Error(FWC_ONLY_ACTION_ERROR);
  }
}

/** Action-friendly gate: returns an error string when the committee is not FWC. */
export function requireFwcCommittee(committee: string | null | undefined): string | null {
  return isFwcCommittee(committee) ? null : FWC_ONLY_ACTION_ERROR;
}
