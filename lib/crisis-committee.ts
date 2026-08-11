// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Crisis-style committees use `/crisis` notes & prompts (chair), `/crisis-slides`,
 * and incident reporting (`/report`). Matches `conferences.committee` labels such as UNSC or FWC.
 */
export function isCrisisCommittee(committee: string | null | undefined): boolean {
  const raw = (committee ?? "").trim();
  if (!raw) return false;
  const u = raw.toUpperCase().replace(/\s+/g, " ");
  return /\bFWC\b/.test(u) || /\bUNSC\b/.test(u);
}
