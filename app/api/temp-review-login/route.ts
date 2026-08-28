// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey } from "@/lib/supabase/publishable-key";
import { ACTIVE_CONFERENCE_COOKIE } from "@/lib/active-conference-cookie";
import { ACTIVE_EVENT_COOKIE } from "@/lib/active-event-cookie";

/**
 * TEMPORARY review helper — development only.
 * Signs in as temp-{role}@intermun.local and seeds event/committee cookies.
 * Delete this route after site review.
 */
const TEMP_PASS = "TempReview!2026";
const EVENT_ID = "11111111-1111-1111-1111-111111111101";
const UNSC_ID = "e2b02bf8-bd34-5fce-a231-318de3f818b2";

const ROLE_EMAIL: Record<string, { email: string; next: string }> = {
  delegate: { email: "temp-delegate@intermun.local", next: "/delegate" },
  chair: { email: "temp-chair@intermun.local", next: "/chair" },
  smt: { email: "temp-smt@intermun.local", next: "/smt" },
};

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const role = (request.nextUrl.searchParams.get("role") || "").toLowerCase();
  const target = ROLE_EMAIL[role];
  if (!target) {
    return NextResponse.json(
      { error: "Use ?role=delegate|chair|smt" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = getSupabasePublishableKey();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  // Prefer request origin so cookies stick when hitting 127.0.0.1 vs localhost.
  const redirectUrl = new URL(target.next, request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: target.email,
    password: TEMP_PASS,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const cookieBase = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
  response.cookies.set(ACTIVE_EVENT_COOKIE, EVENT_ID, cookieBase);
  if (role !== "smt") {
    response.cookies.set(ACTIVE_CONFERENCE_COOKIE, UNSC_ID, cookieBase);
  }

  return response;
}
