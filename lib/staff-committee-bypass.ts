// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { timingSafeEqual } from "crypto";

/** Set `STAFF_COMMITTEE_BYPASS_PASSWORD` in the server environment. When unset, bypass is disabled. */
export function getStaffCommitteeBypassPassword(): string | null {
  const value = process.env.STAFF_COMMITTEE_BYPASS_PASSWORD?.trim();
  return value || null;
}

export function verifyStaffCommitteeBypassPassword(plain: string): boolean {
  const expected = getStaffCommitteeBypassPassword();
  if (!expected) return false;
  const a = Buffer.from(plain, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
