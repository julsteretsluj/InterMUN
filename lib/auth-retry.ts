// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** True when GoTrue / edge returned a retryable overload or timeout. */
export function isRetryableAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isTerminalOtpError(error)) return false;
  const err = error as { message?: unknown; name?: unknown; status?: unknown };
  const status = typeof err.status === "number" ? err.status : NaN;
  if (status === 502 || status === 503 || status === 504 || status === 429) return true;
  const name = String(err.name ?? "");
  if (/AuthRetryableFetchError/i.test(name)) return true;
  const message = String(err.message ?? "").trim();
  if (!message || message === "{}") return true;
  return /gateway timeout|upstream request timeout|deadline exceeded|timed?\s*out|fetch failed|authentication timed out|502|503|504|429/i.test(
    message
  );
}

/**
 * Token was rejected permanently — retrying the same token_hash is useless
 * (and may already have been consumed before a 504 masked the success).
 */
export function isTerminalOtpError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { message?: unknown; code?: unknown; status?: unknown };
  const code = String(err.code ?? "").toLowerCase();
  if (
    code === "otp_expired" ||
    code === "token_expired" ||
    code === "flow_state_expired" ||
    code === "flow_state_not_found"
  ) {
    return true;
  }
  const status = typeof err.status === "number" ? err.status : NaN;
  const message = String(err.message ?? "").toLowerCase();
  if (!message) return false;
  if (
    /otp_expired|token has expired|email link is invalid or has expired|invalid (email )?otp|token is invalid|invalid token|one-time token|token not found|flow state/.test(
      message
    )
  ) {
    return true;
  }
  // GoTrue often uses 403/401 for spent invite/recovery hashes.
  if ((status === 401 || status === 403) && /otp|token|link|expired|invalid/.test(message)) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Linear-ish backoff with a soft cap — used for invite generateLink. */
export function authRetryDelayMs(attemptIndex: number, baseDelayMs = 1200, maxDelayMs = 20_000): number {
  const raw = baseDelayMs * Math.pow(1.7, attemptIndex);
  return Math.min(maxDelayMs, Math.round(raw));
}

/**
 * Retry an Auth admin / client call through intermittent Supabase 504s.
 * Defaults: 4 attempts, growing backoff starting at 1.2s (capped).
 */
export async function withAuthRetry<T>(
  run: () => Promise<T>,
  opts?: {
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    isRetryable?: (error: unknown) => boolean;
    onRetry?: (info: { attempt: number; attempts: number; delayMs: number; error: unknown }) => void;
  }
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 4);
  const baseDelayMs = opts?.baseDelayMs ?? 1200;
  const maxDelayMs = opts?.maxDelayMs ?? 20_000;
  const isRetryable = opts?.isRetryable ?? isRetryableAuthError;

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (i >= attempts - 1 || !isRetryable(error)) throw error;
      const delayMs = authRetryDelayMs(i, baseDelayMs, maxDelayMs);
      opts?.onRetry?.({ attempt: i + 1, attempts, delayMs, error });
      await sleep(delayMs);
    }
  }
  throw lastError;
}
