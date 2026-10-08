// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** True when GoTrue / edge returned a retryable overload or timeout. */
export function isRetryableAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { message?: unknown; name?: unknown; status?: unknown };
  const status = typeof err.status === "number" ? err.status : NaN;
  if (status === 502 || status === 503 || status === 504 || status === 429) return true;
  const name = String(err.name ?? "");
  if (/AuthRetryableFetchError/i.test(name)) return true;
  const message = String(err.message ?? "").trim();
  if (!message || message === "{}") return true;
  return /gateway timeout|upstream request timeout|deadline exceeded|timed?\s*out|fetch failed|502|503|504|429/i.test(
    message
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an Auth admin / client call through intermittent Supabase 504s.
 * Defaults: 4 attempts, exponential backoff starting at 1.2s.
 */
export async function withAuthRetry<T>(
  run: () => Promise<T>,
  opts?: {
    attempts?: number;
    baseDelayMs?: number;
    isRetryable?: (error: unknown) => boolean;
  }
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 4);
  const baseDelayMs = opts?.baseDelayMs ?? 1200;
  const isRetryable = opts?.isRetryable ?? isRetryableAuthError;

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (i >= attempts - 1 || !isRetryable(error)) throw error;
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw lastError;
}
