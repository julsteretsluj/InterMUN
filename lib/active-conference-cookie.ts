import { cookies } from "next/headers";

export const ACTIVE_CONFERENCE_COOKIE = "intermun_active_conference";

const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function getActiveConferenceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACTIVE_CONFERENCE_COOKIE)?.value ?? null;
}

export async function setActiveConferenceId(conferenceId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_CONFERENCE_COOKIE, conferenceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearActiveConference() {
  const jar = await cookies();
  jar.delete(ACTIVE_CONFERENCE_COOKIE);
}
