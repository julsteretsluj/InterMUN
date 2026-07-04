export const OPENING_ORB_PATH = "/marketing/opening-orb.gif?v=1";
/** One full GIF loop (~27 frames @ ~2.8s). */
export const ORB_ANIMATION_HOLD_MS = 3000;
export const ORB_ANIMATION_FADE_MS = 800;
/** Shared across marketing home + auth — set only after a full play-through. */
export const OPENING_ORB_SESSION_KEY = "intermun-opening-orb-v4";

export function preloadOpeningOrb(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = OPENING_ORB_PATH;
  });
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
