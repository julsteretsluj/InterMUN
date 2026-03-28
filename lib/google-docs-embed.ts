/**
 * Build embed URLs for Google Docs. Editing in an iframe requires users to be signed into Google
 * and have access to the doc; Google may still refuse to frame some documents.
 */

// /document/d/ID/… or /document/u/0/d/ID/… (signed-in editor URLs)
const DOC_ID_RE = /\/document(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/;

export function extractGoogleDocsDocumentId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const m = s.match(DOC_ID_RE);
  if (m?.[1]) return m[1];
  try {
    const u = new URL(s);
    const id = u.searchParams.get("id");
    if (id && /^[a-zA-Z0-9_-]+$/.test(id)) return id;
  } catch {
    /* ignore */
  }
  return null;
}

/** Iframe src: full editor UI (menus, font + size controls). Omit rm=minimal so toolbars stay visible. */
export function googleDocsEmbeddedEditSrc(documentId: string): string {
  return `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/edit?embedded=true`;
}

export function googleDocsPreviewSrc(documentId: string): string {
  return `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/preview`;
}
