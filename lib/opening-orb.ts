// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Prefer compressed video; GIF kept as legacy fallback only. */
export const OPENING_ORB_WEBM = "/marketing/opening-orb.webm";
export const OPENING_ORB_MP4 = "/marketing/opening-orb.mp4";
export const OPENING_ORB_POSTER = "/marketing/opening-orb.png";
export const OPENING_ORB_GIF = "/marketing/opening-orb.gif";

/** @deprecated Prefer video sources — GIF retained for older clients. */
export const OPENING_ORB_BASE = OPENING_ORB_GIF;

/** opening-orb.gif metadata: 27 frames @ 9cs (90ms) per frame. */
export const OPENING_ORB_GIF_FRAME_MS = 90;
export const OPENING_ORB_GIF_FRAME_COUNT = 27;
export const OPENING_ORB_GIF_LOOP_MS = OPENING_ORB_GIF_FRAME_MS * OPENING_ORB_GIF_FRAME_COUNT;

/** Full loop on screen before fade — loop length + a minimal paint-jitter buffer. */
export const ORB_ANIMATION_HOLD_MS = OPENING_ORB_GIF_LOOP_MS + 80;
export const ORB_ANIMATION_FADE_MS = 320;

/** Logo click replays this many full GIF loops before fading out. */
export const ORB_ANIMATION_CLICK_LOOPS = 2;

/** Bump when playback logic changes so users get a fresh auto-intro. */
export const OPENING_ORB_SESSION_KEY = "intermun-opening-orb-v8";

/** Cache-busted video URL (webm preferred). */
export function openingOrbUrl(playKey: number): string {
  return `${OPENING_ORB_WEBM}?v=3&play=${playKey}`;
}

export function openingOrbMp4Url(playKey: number): string {
  return `${OPENING_ORB_MP4}?v=3&play=${playKey}`;
}

export function openingOrbPosterUrl(): string {
  return `${OPENING_ORB_POSTER}?v=3`;
}

/** GIF fallback URL. */
export function openingOrbGifUrl(playKey: number): string {
  return `${OPENING_ORB_GIF}?v=3&play=${playKey}`;
}

/** Warm the HTTP cache for the compressed video. */
export function preloadOpeningOrb(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return fetch(openingOrbUrl(0), { cache: "force-cache" })
    .then(() => undefined)
    .catch(() => undefined);
}

/** Load an isolated object URL (GIF fallback path). */
export async function loadOpeningOrbObjectUrl(playKey: number): Promise<string> {
  const response = await fetch(openingOrbGifUrl(playKey), { cache: "no-store" });
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
