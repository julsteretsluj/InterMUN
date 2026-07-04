/**
 * Server-side helpers for @seamunth_press Instagram profile + media.
 */

export const IG_HANDLE = "seamunth_press";
export const IG_PROFILE_URL = `https://www.instagram.com/${IG_HANDLE}/`;
export const IG_WEB_PROFILE_INFO = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${IG_HANDLE}`;
/** Public Instagram web app id used by instagram.com itself. */
export const IG_APP_ID = "936619743392459";
export const PRESS_CORPS_REVALIDATE_SECONDS = 600;
export const PRESS_CORPS_MAX_ITEMS = 18;

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

export type PressCorpsProfile = {
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

const IG_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "x-ig-app-id": IG_APP_ID,
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
} as const;

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

function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** Parse profile picture from public profile HTML when the JSON API is blocked. */
async function fetchAvatarFromProfileHtml(): Promise<string | null> {
  try {
    const res = await fetch(IG_PROFILE_URL, {
      headers: {
        "User-Agent": IG_FETCH_HEADERS["User-Agent"],
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: PRESS_CORPS_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
    if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]);

    const picMatch = html.match(/"profile_pic_url(?:_hd)?":"([^"]+)"/);
    if (picMatch?.[1]) {
      return decodeHtmlEntities(picMatch[1].replace(/\\u0026/g, "&"));
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function resolvePressCorpsAvatarUrl(): Promise<string | null> {
  try {
    const res = await fetch(IG_WEB_PROFILE_INFO, {
      headers: IG_FETCH_HEADERS,
      next: { revalidate: PRESS_CORPS_REVALIDATE_SECONDS },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: { user?: { profile_pic_url_hd?: string; profile_pic_url?: string } };
      };
      const user = json?.data?.user;
      const fromApi = user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null;
      if (fromApi) return fromApi;
    }
  } catch {
    /* fall through */
  }

  return fetchAvatarFromProfileHtml();
}

export async function fetchPressCorpsProfile(): Promise<PressCorpsProfile> {
  const base: Omit<PressCorpsProfile, "items" | "error"> = {
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
      headers: IG_FETCH_HEADERS,
      next: { revalidate: PRESS_CORPS_REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      const avatarUrl = await fetchAvatarFromProfileHtml();
      return {
        ...base,
        avatarUrl,
        items: [],
        error: `Upstream responded ${res.status}`,
      };
    }

    const json = (await res.json()) as {
      data?: {
        user?: {
          full_name?: string;
          profile_pic_url?: string;
          profile_pic_url_hd?: string;
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
      .slice(0, PRESS_CORPS_MAX_ITEMS);

    let avatarUrl = user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null;
    if (!avatarUrl) avatarUrl = await fetchAvatarFromProfileHtml();

    return {
      ...base,
      fullName: user?.full_name ?? null,
      avatarUrl,
      followers: user?.edge_followed_by?.count ?? null,
      postCount: user?.edge_owner_to_timeline_media?.count ?? null,
      items,
    };
  } catch (err) {
    const avatarUrl = await fetchAvatarFromProfileHtml();
    return {
      ...base,
      avatarUrl,
      items: [],
      error: err instanceof Error ? err.message : "Failed to load feed",
    };
  }
}

export const PRESS_CORPS_IMAGE_HOST_SUFFIXES = ["cdninstagram.com", "fbcdn.net", "instagram.com"];

export function isPressCorpsImageHost(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  return PRESS_CORPS_IMAGE_HOST_SUFFIXES.some(
    (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
  );
}
