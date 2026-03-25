import { cookies } from "next/headers";

export const COMMITTEE_VERIFIED_COOKIE = "intermun_committee_verified";

const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function getVerifiedConferenceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COMMITTEE_VERIFIED_COOKIE)?.value ?? null;
}

export async function setVerifiedConferenceId(conferenceId: string) {
  const jar = await cookies();
  jar.set(COMMITTEE_VERIFIED_COOKIE, conferenceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearVerifiedConference() {
  const jar = await cookies();
  jar.delete(COMMITTEE_VERIFIED_COOKIE);
}
