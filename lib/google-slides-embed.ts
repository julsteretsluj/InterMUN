/**
 * Build embed URLs for Google Slides. Embedding requires the deck to allow it in Google’s sharing settings.
 */

const PRESENTATION_ID_RE = /\/presentation(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/;

export function extractGoogleSlidesPresentationId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const m = s.match(PRESENTATION_ID_RE);
  if (m?.[1]) return m[1];
  try {
    const u = new URL(s);
    if (!u.hostname.includes("docs.google.com")) return null;
    const id = u.searchParams.get("id");
    if (id && /^[a-zA-Z0-9_-]+$/.test(id)) return id;
  } catch {
    /* ignore */
  }
  return null;
}

export function isGoogleSlidesUrl(raw: string | null | undefined): boolean {
  return extractGoogleSlidesPresentationId(raw) !== null;
}

/** Standard iframe embed (not presenter fullscreen). */
export function googleSlidesEmbedSrc(presentationId: string): string {
  return `https://docs.google.com/presentation/d/${encodeURIComponent(presentationId)}/embed?start=false&loop=false&delayms=3000`;
}
