// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export type SpeechOutlinePoint = {
  id: string;
  text: string;
  done: boolean;
};

export const MAX_SPEECH_OUTLINE_POINTS = 50;
export const MAX_SPEECH_OUTLINE_POINT_LENGTH = 280;

export function parseSpeechOutlinePoints(raw: unknown): SpeechOutlinePoint[] {
  if (!Array.isArray(raw)) return [];
  const out: SpeechOutlinePoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!id || !text) continue;
    out.push({ id, text, done: row.done === true });
  }
  return out;
}

export type SpeechOutlineValidation =
  | { ok: true; points: SpeechOutlinePoint[] }
  | { ok: false; error: "too_many_points" | "point_too_long" };

/** Sanitize client-supplied points; whitespace-only entries are dropped. */
export function validateSpeechOutlinePoints(raw: unknown): SpeechOutlineValidation {
  const points = parseSpeechOutlinePoints(raw);
  if (points.length > MAX_SPEECH_OUTLINE_POINTS) {
    return { ok: false, error: "too_many_points" };
  }
  if (points.some((p) => p.text.length > MAX_SPEECH_OUTLINE_POINT_LENGTH)) {
    return { ok: false, error: "point_too_long" };
  }
  return { ok: true, points };
}

export function createSpeechOutlinePoint(text: string): SpeechOutlinePoint {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
  };
}
