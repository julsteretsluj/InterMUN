// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Default budget for browser + server Supabase calls (login, RPC, queries).
 * Keep under typical reverse-proxy limits (Render/Cloudflare ~30s).
 */
export const SUPABASE_FETCH_TIMEOUT_MS = 20_000;

/** Shorter edge budget so a stuck Auth GET /user cannot stall middleware. */
export const SUPABASE_MIDDLEWARE_FETCH_TIMEOUT_MS = 8_000;

function timeoutBody(input: RequestInfo | URL): string {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : typeof Request !== "undefined" && input instanceof Request
          ? input.url
          : "";
  const isAuth = /\/auth\/v1\//i.test(url);
  const message = isAuth
    ? "Authentication timed out. Please try again."
    : "Request timed out. Please try again.";
  return JSON.stringify({
    error: "request_timeout",
    msg: message,
    message,
  });
}

function combineSignals(userSignal: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!userSignal) return timeout;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([userSignal, timeout]);
  }
  return timeout;
}

function isTimeoutAbort(timeoutSignal: AbortSignal, userSignal: AbortSignal | undefined, err: unknown): boolean {
  if (!timeoutSignal.aborted) return false;
  // Caller cancelled the request — do not misreport as our deadline.
  if (userSignal?.aborted) {
    const reason = timeoutSignal.reason as { name?: string } | undefined;
    // Both aborted: only claim timeout when our signal's reason is TimeoutError.
    return reason?.name === "TimeoutError";
  }
  const name = err instanceof Error ? err.name : "";
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Caps Supabase HTTP calls so a stuck Auth GET /user cannot 504 the whole app.
 * Timeouts return a JSON 504 so supabase-js surfaces an AuthError instead of throwing.
 * Caller-initiated aborts are rethrown (not turned into fake timeouts).
 */
export function createTimedSupabaseFetch(timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS) {
  return async function timedSupabaseFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const userSignal = init?.signal ?? undefined;
    try {
      return await fetch(input, {
        ...init,
        signal: combineSignals(userSignal, timeoutSignal),
      });
    } catch (err) {
      if (isTimeoutAbort(timeoutSignal, userSignal, err)) {
        return new Response(timeoutBody(input), {
          status: 504,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw err;
    }
  };
}

export const timedSupabaseFetch = createTimedSupabaseFetch(SUPABASE_FETCH_TIMEOUT_MS);

export const timedMiddlewareSupabaseFetch = createTimedSupabaseFetch(
  SUPABASE_MIDDLEWARE_FETCH_TIMEOUT_MS
);
