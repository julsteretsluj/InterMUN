// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Parse proposed total minutes from a Press / timed motion title or description. */
export function parseMotionProposedMinutes(
  title?: string | null,
  description?: string | null
): number | null {
  const text = `${title ?? ""}\n${description ?? ""}`;
  const match =
    text.match(/total\s+(\d+)\s*min/i) ||
    text.match(/(\d+)\s*-?\s*minutes?\b/i) ||
    text.match(/(\d+)\s*-?\s*minute\b/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Parse speaker seconds from extend-opening-speech style titles / timing lines. */
export function parseMotionProposedSpeakerSeconds(
  title?: string | null,
  description?: string | null
): number | null {
  const text = `${title ?? ""}\n${description ?? ""}`;
  const match =
    text.match(/Extend Speaker Time to\s+(\d+)\s*seconds?/i) ||
    text.match(/Timing:\s*speaker\s+(\d+)\s*s/i) ||
    text.match(/to\s+(\d+)\s*seconds?\b/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function pressMotionFloorLabel(
  procedureCode: string | null | undefined,
  minutes?: number | null
): string {
  const m = minutes && minutes > 0 ? ` (${minutes} min)` : "";
  switch (procedureCode) {
    case "interview":
      return `Interview period${m}`;
    case "press_conference":
      return `Press conference${m}`;
    case "writing_time":
      return `Writing time${m}`;
    default:
      return procedureCode?.replace(/_/g, " ") ?? "Floor";
  }
}

export function isPressTimedProcedure(code: string | null | undefined): boolean {
  return code === "interview" || code === "press_conference" || code === "writing_time";
}
