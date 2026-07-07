// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export type SpeechOutlinePoint = {
  id: string;
  text: string;
  done: boolean;
};

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

export function createSpeechOutlinePoint(text: string): SpeechOutlinePoint {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
  };
}
