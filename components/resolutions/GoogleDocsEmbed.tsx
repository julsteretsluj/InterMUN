"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MonitorPlay } from "lucide-react";
import {
  extractGoogleDocsDocumentId,
  googleDocsEmbeddedEditSrc,
  googleDocsPreviewSrc,
} from "@/lib/google-docs-embed";

type Mode = "edit" | "preview";

export function GoogleDocsEmbed({
  googleDocsUrl,
  heading = "Resolution document",
}: {
  googleDocsUrl: string;
  heading?: string;
}) {
  const docId = useMemo(() => extractGoogleDocsDocumentId(googleDocsUrl), [googleDocsUrl]);
  const [mode, setMode] = useState<Mode>("edit");

  if (!docId) {
    return (
      <div className="rounded-lg border border-amber-200/50 bg-amber-950/20 px-3 py-2 text-sm text-brand-muted">
        This link does not look like a Google Docs URL. Use a link of the form{" "}
        <code className="text-xs text-brand-navy/90">docs.google.com/document/d/…</code> or open the
        document in a new tab.
      </div>
    );
  }

  const iframeSrc = mode === "edit" ? googleDocsEmbeddedEditSrc(docId) : googleDocsPreviewSrc(docId);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-brand-navy flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-brand-gold opacity-90" aria-hidden />
          {heading}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-brand-line/60 p-0.5 bg-brand-navy-soft/30 text-xs">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={
                mode === "edit"
                  ? "px-2.5 py-1 rounded-md bg-brand-gold/25 text-brand-gold-bright font-medium"
                  : "px-2.5 py-1 rounded-md text-brand-muted hover:text-brand-navy"
              }
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={
                mode === "preview"
                  ? "px-2.5 py-1 rounded-md bg-brand-gold/25 text-brand-gold-bright font-medium"
                  : "px-2.5 py-1 rounded-md text-brand-muted hover:text-brand-navy"
              }
            >
              Preview
            </button>
          </div>
          <a
            href={googleDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold hover:text-brand-gold-bright hover:underline"
          >
            Open in Google Docs
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
        </div>
      </div>
      <p className="text-[0.7rem] text-brand-muted leading-snug">
        Sign in to Google in this browser if the frame is blank. If Google blocks embedding for this
        file, use <strong className="text-brand-navy/80 font-medium">Open in Google Docs</strong>.
      </p>
      <div className="relative rounded-xl overflow-hidden border border-brand-line/60 bg-brand-paper shadow-inner">
        <iframe
          title={heading}
          src={iframeSrc}
          className="w-full h-[min(72vh,820px)] bg-brand-cream"
          allow="clipboard-read; clipboard-write; fullscreen"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
