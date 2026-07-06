// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const OPENING_ORB_BASE = "/marketing/opening-orb.gif";

/** opening-orb.gif metadata: 27 frames @ 9cs (90ms) per frame. */
export const OPENING_ORB_GIF_FRAME_MS = 90;
export const OPENING_ORB_GIF_FRAME_COUNT = 27;
export const OPENING_ORB_GIF_LOOP_MS = OPENING_ORB_GIF_FRAME_MS * OPENING_ORB_GIF_FRAME_COUNT;

/** Full loop on screen before fade — loop length + buffer for decode / paint jitter. */
export const ORB_ANIMATION_HOLD_MS = OPENING_ORB_GIF_LOOP_MS + 900;
export const ORB_ANIMATION_FADE_MS = 800;

/** Logo click replays this many full GIF loops before fading out. */
export const ORB_ANIMATION_CLICK_LOOPS = 2;

/** Bump when playback logic changes so users get a fresh auto-intro. */
export const OPENING_ORB_SESSION_KEY = "intermun-opening-orb-v6";

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
