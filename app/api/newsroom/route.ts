import { NextResponse } from "next/server";

/**
 * Live "current affairs" feed proxy.
 *
 * Fetches the official UN News RSS feed server-side (cached), parses it, and
 * returns clean JSON so the client never hits the external source directly.
 * The response is cached/revalidated so many viewers polling this route do not
 * hammer news.un.org.
 *
 * GET /api/newsroom
 */

const UN_NEWS_RSS_URL = "https://news.un.org/feed/subscribe/en/news/all/rss.xml";
const MAX_ITEMS = 24;
/** Seconds the upstream feed is cached before a fresh fetch. */
const REVALIDATE_SECONDS = 180;

export type NewsroomItem = {
  id: string;
  title: string;
  link: string;
  publishedAt: string | null;
  summary: string;
};

export type NewsroomResponse = {
  source: string;
  sourceLabel: string;
  fetchedAt: string;
  items: NewsroomItem[];
  error?: string;
};

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Read the first `<tag>…</tag>` (CDATA-aware) inside an item block. */
function readTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1].trim();
  return decodeEntities(value);
}

function parseRss(xml: string): NewsroomItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const items: NewsroomItem[] = [];
  for (const block of blocks) {
    const title = stripTags(readTag(block, "title"));
    if (!title) continue;
    const link = stripTags(readTag(block, "link")) || stripTags(readTag(block, "guid"));
    const pubDate = stripTags(readTag(block, "pubDate"));
    const description = stripTags(readTag(block, "description"));
    const parsedDate = pubDate ? new Date(pubDate) : null;
    items.push({
      id: link || `${title}-${pubDate}`,
      title,
      link,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
      summary: description.slice(0, 320),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

export async function GET() {
  const base: Omit<NewsroomResponse, "items" | "error"> = {
    source: UN_NEWS_RSS_URL,
    sourceLabel: "UN News",
    fetchedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(UN_NEWS_RSS_URL, {
      headers: {
        "User-Agent": "InterMUN-Newsroom/1.0 (+https://news.un.org)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ...base, items: [], error: `Upstream responded ${res.status}` } satisfies NewsroomResponse,
        { status: 200 }
      );
    }

    const xml = await res.text();
    const items = parseRss(xml);
    return NextResponse.json({ ...base, items } satisfies NewsroomResponse, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ...base,
        items: [],
        error: err instanceof Error ? err.message : "Failed to load feed",
      } satisfies NewsroomResponse,
      { status: 200 }
    );
  }
}
