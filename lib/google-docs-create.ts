// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Opens Google’s “new blank document” flow in the browser.
 * The active Google session owns the file; users paste the document URL back into this app.
 *
 * @see https://doc.new — Google-owned shortcut (same as creating from Drive)
 */
export const GOOGLE_DOC_NEW_DOCUMENT_URL = "https://doc.new";

export function openNewGoogleDocument() {
  if (typeof window === "undefined") return;
  window.open(GOOGLE_DOC_NEW_DOCUMENT_URL, "_blank", "noopener,noreferrer");
}
