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

  // Skip the Auth GET /user round-trip when there is nothing to refresh.
  if (hasSupabaseSessionCookie(request)) {
    try {
      await supabase.auth.getUser();
    } catch {
      // Timed-out Auth must not 504 the whole site.
    }
  }

  return response;
}
