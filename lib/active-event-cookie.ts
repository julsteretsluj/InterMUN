import { cookies } from "next/headers";

export const ACTIVE_EVENT_COOKIE = "intermun_active_event";

const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function getActiveEventId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACTIVE_EVENT_COOKIE)?.value ?? null;
}

export async function setActiveEventId(eventId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_EVENT_COOKIE, eventId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearActiveEvent() {
  const jar = await cookies();
  jar.delete(ACTIVE_EVENT_COOKIE);
}
