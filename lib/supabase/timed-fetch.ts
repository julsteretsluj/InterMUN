// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Keep under typical reverse-proxy limits (Render/Cloudflare ~30s). */
export const SUPABASE_FETCH_TIMEOUT_MS = 8_000;

const TIMEOUT_BODY = JSON.stringify({
  error: "request_timeout",
  msg: "Authentication timed out. Please try again.",
  message: "Authentication timed out. Please try again.",
});

function combineSignals(userSignal: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!userSignal) return timeout;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([userSignal, timeout]);
  }
  return timeout;
}

/**
 * Caps every Supabase HTTP call so a stuck Auth GET /user cannot 504 the whole app.
 * Timeouts return a JSON 504 so supabase-js surfaces an AuthError instead of throwing.
 */
export async function timedSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const timeout = AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: combineSignals(init?.signal ?? undefined, timeout),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return new Response(TIMEOUT_BODY, {
        status: 504,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }
}
