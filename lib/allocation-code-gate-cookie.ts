import { cookies } from "next/headers";

export const ALLOCATION_CODE_VERIFIED_COOKIE = "intermun_allocation_code_verified";

const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function getAllocationCodeVerifiedConferenceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ALLOCATION_CODE_VERIFIED_COOKIE)?.value ?? null;
}

export async function setAllocationCodeVerifiedConferenceId(conferenceId: string) {
  const jar = await cookies();
  jar.set(ALLOCATION_CODE_VERIFIED_COOKIE, conferenceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearAllocationCodeVerification() {
  const jar = await cookies();
  jar.delete(ALLOCATION_CODE_VERIFIED_COOKIE);
}
