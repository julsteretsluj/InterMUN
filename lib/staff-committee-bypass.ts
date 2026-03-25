import { timingSafeEqual } from "crypto";

/** Override via STAFF_COMMITTEE_BYPASS_PASSWORD (recommended for production). */
const DEFAULT = "IntermunStaffOrg2025!";

export function getStaffCommitteeBypassPassword(): string {
  return process.env.STAFF_COMMITTEE_BYPASS_PASSWORD?.trim() || DEFAULT;
}

export function verifyStaffCommitteeBypassPassword(plain: string): boolean {
  const expected = getStaffCommitteeBypassPassword();
  const a = Buffer.from(plain, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
