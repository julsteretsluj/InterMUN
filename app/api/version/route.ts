// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Deployment id for the stale-tab check. Prerendered at build and served from the
 * CDN; excluded from `proxy.ts` so polling never reaches Supabase.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    { id: process.env.NEXT_PUBLIC_APP_BUILD_ID ?? "" },
    { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } }
  );
}
