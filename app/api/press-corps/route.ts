import { NextResponse } from "next/server";

/**
 * SEAMUN Press Corps Instagram feed proxy.
 *
 * Fetches the public Instagram profile of @seamunth_press server-side (cached),
 * normalises the recent media into clean JSON, and returns it so the client
 * never talks to Instagram directly. The response is cached / revalidated so
 * many viewers polling this route do not hammer Instagram.
 *
 * Instagram frequently gates this public endpoint behind a login wall or rate
 * limits it. When that happens we degrade gracefully: `items` is empty and the
 * client shows a "Follow on Instagram" call-to-action instead.
 *
 * GET /api/press-corps
 */

const IG_HANDLE = "seamunth_press";
const IG_PROFILE_URL = `https://www.instagram.com/${IG_HANDLE}/`;
const IG_WEB_PROFILE_INFO = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${IG_HANDLE}`;
/** Public Instagram web app id used by instagram.com itself. */
const IG_APP_ID = "936619743392459";
const MAX_ITEMS = 18;
/** Seconds the upstream feed is cached before a fresh fetch (10 minutes). */
const REVALIDATE_SECONDS = 600;

export type PressCorpsItem = {
  id: string;
  shortcode: string;
  permalink: string;
  thumbnailUrl: string | null;
  caption: string;
  isVideo: boolean;
  takenAt: string | null;
  likes: number | null;
  comments: number | null;
};

export type PressCorpsResponse = {
  handle: string;
  profileUrl: string;
  fullName: string | null;
  avatarUrl: string | null;
  followers: number | null;
  postCount: number | null;
  fetchedAt: string;
  items: PressCorpsItem[];
  error?: string;
};

type IgCaptionEdge = { node?: { text?: string } };
type IgMediaNode = {
  id?: string;
  shortcode?: string;
  display_url?: string;
  thumbnail_src?: string;
  is_video?: boolean;
  taken_at_timestamp?: number;
  edge_media_to_caption?: { edges?: IgCaptionEdge[] };
  edge_liked_by?: { count?: number };
  edge_media_preview_like?: { count?: number };
  edge_media_to_comment?: { count?: number };
};

function firstCaption(node: IgMediaNode): string {
  const text = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? "";
  return text.replace(/\s+/g, " ").trim().slice(0, 280);
}

function mapMedia(node: IgMediaNode): PressCorpsItem | null {
  const shortcode = node.shortcode;
  if (!shortcode) return null;
  const takenAt =
    typeof node.taken_at_timestamp === "number"
      ? new Date(node.taken_at_timestamp * 1000).toISOString()
      : null;
  return {
    id: node.id ?? shortcode,
    shortcode,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    thumbnailUrl: node.thumbnail_src ?? node.display_url ?? null,
    caption: firstCaption(node),
    isVideo: Boolean(node.is_video),
    takenAt,
    likes: node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? null,
    comments: node.edge_media_to_comment?.count ?? null,
  };
}

export async function GET() {
  const base: Omit<PressCorpsResponse, "items" | "error"> = {
    handle: IG_HANDLE,
    profileUrl: IG_PROFILE_URL,
    fullName: null,
    avatarUrl: null,
    followers: null,
    postCount: null,
    fetchedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(IG_WEB_PROFILE_INFO, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "x-ig-app-id": IG_APP_ID,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ...base, items: [], error: `Upstream responded ${res.status}` } satisfies PressCorpsResponse,
        { status: 200 }
      );
    }

    const json = (await res.json()) as {
      data?: {
        user?: {
          full_name?: string;
          profile_pic_url?: string;
          edge_followed_by?: { count?: number };
          edge_owner_to_timeline_media?: { count?: number; edges?: { node?: IgMediaNode }[] };
        };
      };
    };

    const user = json?.data?.user;
    const edges = user?.edge_owner_to_timeline_media?.edges ?? [];
    const items = edges
      .map((edge) => (edge?.node ? mapMedia(edge.node) : null))
      .filter((item): item is PressCorpsItem => item !== null)
      .slice(0, MAX_ITEMS);

    return NextResponse.json(
      {
        ...base,
        fullName: user?.full_name ?? null,
        avatarUrl: user?.profile_pic_url ?? null,
        followers: user?.edge_followed_by?.count ?? null,
        postCount: user?.edge_owner_to_timeline_media?.count ?? null,
        items,
      } satisfies PressCorpsResponse,
      {
        status: 200,
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ...base,
        items: [],
        error: err instanceof Error ? err.message : "Failed to load feed",
      } satisfies PressCorpsResponse,
      { status: 200 }
    );
  }
}
