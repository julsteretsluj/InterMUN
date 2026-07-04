import { NextResponse } from "next/server";
import { isPressCorpsImageHost, PRESS_CORPS_REVALIDATE_SECONDS } from "@/lib/press-corps-instagram";

/**
 * Thumbnail proxy for Press Corps Instagram media.
 *
 * Instagram CDN image URLs are signed and often refuse hot-linking from other
 * origins (403). We stream them through our own origin so <img> tags render
 * reliably. Only Instagram / Facebook CDN hosts are allowed.
 *
 * GET /api/press-corps/image?u=<encoded cdn url>
 */

function isAllowed(url: URL): boolean {
  return isPressCorpsImageHost(url);
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (!isAllowed(target)) return new NextResponse("Host not allowed", { status: 400 });

  try {
    const upstream = await fetch(target.toString(), {
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
