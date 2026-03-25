import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey } from "./publishable-key";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

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

  await supabase.auth.getUser();

  return response;
}
