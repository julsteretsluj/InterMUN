export const OPENING_ORB_BASE = "/marketing/opening-orb.gif";
/** One full GIF loop — tuned to opening-orb.gif (~3.1s). */
export const ORB_ANIMATION_HOLD_MS = 3200;
export const ORB_ANIMATION_FADE_MS = 800;
/** Bump when playback logic changes so users get a fresh auto-intro. */
export const OPENING_ORB_SESSION_KEY = "intermun-opening-orb-v5";

/** Cache-busted URL so each play remounts a fresh GIF decode. */
export function openingOrbUrl(playKey: number): string {
  return `${OPENING_ORB_BASE}?v=2&play=${playKey}`;
}

/** Warm the HTTP cache without decoding/playing the GIF in an Image node. */
export function preloadOpeningOrb(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return fetch(openingOrbUrl(0), { cache: "force-cache" })
    .then(() => undefined)
    .catch(() => undefined);
}

/** Load an isolated object URL so the visible <img> always animates from frame 0. */
export async function loadOpeningOrbObjectUrl(playKey: number): Promise<string> {
  const response = await fetch(openingOrbUrl(playKey), { cache: "no-store" });
  if (!response.ok) throw new Error("opening-orb fetch failed");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function hasSeenOpeningOrb(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(OPENING_ORB_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOpeningOrbSeen(): void {
  try {
    sessionStorage.setItem(OPENING_ORB_SESSION_KEY, "1");
  } catch {
    /* private browsing */
  }
}

/** @deprecated Use openingOrbUrl(playKey) */
export const OPENING_ORB_PATH = openingOrbUrl(0);
