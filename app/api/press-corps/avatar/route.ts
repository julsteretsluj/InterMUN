import { NextResponse } from "next/server";
import {
  PRESS_CORPS_REVALIDATE_SECONDS,
  resolvePressCorpsAvatarUrl,
} from "@/lib/press-corps-instagram";

/**
 * Cached profile picture for @seamunth_press.
 * GET /api/press-corps/avatar
 */
export async function GET() {
  const avatarUrl = await resolvePressCorpsAvatarUrl();
  if (!avatarUrl) {
    return new NextResponse("Avatar unavailable", { status: 404 });
  }

  try {
    const upstream = await fetch(avatarUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      next: { revalidate: PRESS_CORPS_REVALIDATE_SECONDS },
    });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, s-maxage=${PRESS_CORPS_REVALIDATE_SECONDS}, stale-while-revalidate=${PRESS_CORPS_REVALIDATE_SECONDS * 2}`,
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}
