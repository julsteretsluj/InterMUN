// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { isCommitteeChairSeatLabel } from "@/lib/dais-seat-plan";

/**
 * Same gate used by the chair speaker list picker and opening-speech A–Z setup:
 * exclude committee chair/dais seats, and (outside crisis) seats linked to a chair profile.
 */
export function isSpeakerListEligibleAllocation(
  alloc: { country?: string | null; userRole?: string | null },
  isCrisisCommittee = false
): boolean {
  if (isCommitteeChairSeatLabel(alloc.country)) return false;
  const role = alloc.userRole?.toString().trim().toLowerCase();
  if (role === "chair" && !isCrisisCommittee) return false;
  return Boolean((alloc.country ?? "").trim());
}
