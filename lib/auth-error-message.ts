// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** GoTrue / fetch failures often arrive as empty `{}` or a deadline string. */
export function formatAuthError(err: unknown, fallback: string): string {
  let raw = "";
  if (err instanceof Error) {
    raw = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    raw = String((err as { message?: unknown }).message ?? "");
  } else if (typeof err === "string") {
    raw = err;
  }
  raw = raw.trim();
  if (!raw || raw === "{}" || raw === "[object Object]") return fallback;
  if (
    /deadline exceeded|timed? ?out|aborted|failed to fetch|networkerror|fetch failed|522|504|503|502/i.test(
      raw
    )
  ) {
    return fallback;
  }
  return raw;
}
