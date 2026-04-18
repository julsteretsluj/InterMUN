"use client";

import { useMemo } from "react";
import { ExternalLink, Presentation } from "lucide-react";
import {
  extractGoogleSlidesPresentationId,
  googleSlidesEmbedSrc,
} from "@/lib/google-slides-embed";
import { cn } from "@/lib/utils";

export function GoogleSlidesEmbed({
  slidesUrl,
  heading = "Crisis slides",
  compact = false,
}: {
  slidesUrl: string;
  heading?: string;
  /** Shorter iframe on small layouts */
  compact?: boolean;
}) {
  const presentationId = useMemo(() => extractGoogleSlidesPresentationId(slidesUrl), [slidesUrl]);

  if (!presentationId) {
    return (
      <div className="rounded-lg border border-amber-200/50 bg-amber-950/20 px-3 py-2 text-sm text-brand-muted">
        This link does not look like a Google Slides URL. Use{" "}
        <code className="text-xs text-brand-navy/90">docs.google.com/presentation/d/…</code> or open the deck in a
        new tab.
      </div>
    );
  }

  const iframeSrc = googleSlidesEmbedSrc(presentationId);
  const openHref = slidesUrl.trim().startsWith("http")
    ? slidesUrl.trim()
    : `https://docs.google.com/presentation/d/${presentationId}/edit`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-brand-navy flex items-center gap-2">
          <Presentation className="w-4 h-4 text-brand-accent opacity-90" aria-hidden />
          {heading}
        </p>
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent-bright hover:underline"
        >
          Open in Google Slides
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>
      <p className="text-[0.7rem] text-brand-muted leading-snug">
        If the frame is blank, open the deck in Google Slides and use <strong>Share</strong> so anyone with the link
        can view (or your school’s Google domain). Presenter fullscreen is not available inside the embed.
      </p>
      <div className="relative overflow-hidden rounded-xl border border-brand-line/60 bg-brand-paper shadow-inner">
        <iframe
          title={heading}
          src={iframeSrc}
          className={cn(
            "w-full bg-slate-50 dark:bg-brand-cream",
            compact
              ? "h-[min(480px,55vh)] min-h-[280px] sm:h-[min(520px,60vh)]"
              : "min-h-[65vh] h-[calc(100dvh-14rem)]"
          )}
          allow="fullscreen"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
