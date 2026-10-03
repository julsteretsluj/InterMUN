// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey } from "./publishable-key";
import { timedSupabaseFetch } from "./timed-fetch";
import { LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n/locales";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(
    (c) => /-auth-token(?:\.\d+)?$/.test(c.name) && Boolean(c.value)
  );
}

function decodeBase64UrlJson(input: string): unknown {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return JSON.parse(atob(normalized + pad));
}

/**
 * Best-effort JWT exp from the chunked Supabase auth cookie.
 * If we cannot parse, return null so callers fall back to getUser().
 */
function readAccessTokenExpiryMs(request: NextRequest): number | null {
  try {
    const chunks = request.cookies
      .getAll()
      .filter((c) => /-auth-token(?:\.\d+)?$/.test(c.name) && Boolean(c.value))
      .sort((a, b) => {
        const ai = Number(a.name.split(".").pop());
        const bi = Number(b.name.split(".").pop());
        const aNum = Number.isFinite(ai) && a.name.endsWith(`.${ai}`) ? ai : -1;
        const bNum = Number.isFinite(bi) && b.name.endsWith(`.${bi}`) ? bi : -1;
        return aNum - bNum;
      });
    if (chunks.length === 0) return null;

    const raw = chunks.map((c) => c.value).join("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Cookie may be base64-encoded JSON (common with @supabase/ssr).
      parsed = decodeBase64UrlJson(raw);
    }

    let accessToken: string | null = null;
    if (typeof parsed === "string") {
      accessToken = parsed;
    } else if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      accessToken = parsed[0];
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as { access_token?: unknown; currentSession?: { access_token?: unknown } };
      if (typeof obj.access_token === "string") accessToken = obj.access_token;
      else if (typeof obj.currentSession?.access_token === "string") {
        accessToken = obj.currentSession.access_token;
      }
    }
    if (!accessToken) return null;

    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = decodeBase64UrlJson(parts[1]!) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/** Skip Auth GET /user when the access token is still comfortably valid. */
function shouldRefreshAuthUser(request: NextRequest, skewMs = 120_000): boolean {
  const expMs = readAccessTokenExpiryMs(request);
  if (expMs == null) return true;
  return expMs <= Date.now() + skewMs;
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-search", request.nextUrl.search);
  requestHeaders.set("x-locale", resolveLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value).toString());

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = getSupabasePublishableKey();
  if (!url || !anonKey) {
    console.error(
      "[intermun] Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key (check Vercel env)."
    );
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    global: { fetch: timedSupabaseFetch },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (options) response.cookies.set(name, value, options);
          else response.cookies.set(name, value);
        });
      },
    },
  });

  // Skip the Auth GET /user round-trip when the JWT is still valid.
  // Dashboard RSC still verifies via getCachedDashboardAuth → getUser().
  if (hasSupabaseSessionCookie(request) && shouldRefreshAuthUser(request)) {
    try {
      await supabase.auth.getUser();
    } catch {
      // Timed-out Auth must not 504 the whole site.
    }
  }

  return response;
}
