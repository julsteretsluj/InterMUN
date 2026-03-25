import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

/** Format: hexSalt:hexHash (for storage in conferences.committee_password_hash) */
export function hashCommitteePassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyCommitteePassword(plain: string, stored: string | null): boolean {
  if (!stored || !plain) return false;
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  try {
    const derived = scryptSync(plain, salt, KEYLEN);
    const expected = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
