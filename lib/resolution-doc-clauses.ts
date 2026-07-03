/**
 * Fetch a public Google Doc as plain text and extract operative clauses.
 *
 * A Google Doc only exposes its `export?format=txt` endpoint to anyone when it
 * is shared as "anyone with the link can view". So a successful fetch both
 * proves the doc is public AND gives us the text to parse. If the doc is
 * private, Google returns an HTML sign-in page (or a non-200), which we treat
 * as "not public" and surface to the user.
 */

import { extractGoogleDocsDocumentId } from "@/lib/google-docs-embed";

export class GoogleDocNotPublicError extends Error {
  constructor(message = "Google Doc is not publicly viewable") {
    super(message);
    this.name = "GoogleDocNotPublicError";
  }
}

export function googleDocExportTxtUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/export?format=txt`;
}

/** Fetch the doc's plain text. Throws GoogleDocNotPublicError when not public. */
export async function fetchGoogleDocText(rawUrl: string | null | undefined): Promise<string> {
  const docId = extractGoogleDocsDocumentId(rawUrl);
  if (!docId) throw new GoogleDocNotPublicError("That is not a valid Google Docs link.");

  let res: Response;
  try {
    res = await fetch(googleDocExportTxtUrl(docId), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/plain,*/*;q=0.8",
      },
      cache: "no-store",
    });
  } catch {
    throw new GoogleDocNotPublicError("Could not reach the Google Doc. Check the link.");
  }

  if (!res.ok) {
    throw new GoogleDocNotPublicError(
      "Could not read the doc. Set sharing to 'Anyone with the link can view' and try again."
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();

  // A private doc redirects to an HTML sign-in / access page rather than txt.
  const looksLikeHtml =
    contentType.includes("text/html") ||
    /^\s*<(?:!doctype|html)/i.test(body) ||
    /accounts\.google\.com|Sign in|Request access|You need access/i.test(body.slice(0, 2000));
  if (looksLikeHtml) {
    throw new GoogleDocNotPublicError(
      "The doc isn't publicly viewable. Set sharing to 'Anyone with the link can view' and try again."
    );
  }

  return body;
}

/**
 * Extract operative clauses: numbered / lettered / roman items. Continuation
 * lines (wrapped text without a marker) are folded into the current clause.
 * Preambulatory and heading lines (no marker) before the first item are ignored.
 */
export function extractOperativeClauses(text: string): string[] {
  // Google txt export uses \r\n and a BOM.
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  // Leading marker: "1." "1)" "12:" "a." "a)" "iv." "iv)" (optionally sub-lettered).
  const markerRe = /^\s{0,8}(?:\d{1,3}|[a-zA-Z]|(?:[ivxlcdm]{1,7}))[.):]\s+\S/;
  // Strip only the leading marker token for cleaner clause text.
  const stripMarkerRe = /^\s{0,8}(?:\d{1,3}|[a-zA-Z]|(?:[ivxlcdm]{1,7}))[.):]\s+/;

  const clauses: string[] = [];
  let current: string | null = null;

  const push = () => {
    if (current == null) return;
    const cleaned = current.replace(/\s+/g, " ").trim();
    if (cleaned) clauses.push(cleaned);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      // Blank line ends the current clause.
      push();
      continue;
    }
    if (markerRe.test(line)) {
      push();
      current = line.replace(stripMarkerRe, "");
    } else if (current != null) {
      // Continuation of the current operative clause.
      current += ` ${line.trim()}`;
    }
    // Lines before the first marker (title / preamble) are ignored.
  }
  push();

  return clauses;
}
