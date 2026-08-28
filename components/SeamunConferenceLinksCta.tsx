// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useTranslations } from "next-intl";
import { SEAMUN_SITE_URL } from "@/lib/seamun-conference-links";
import { cn } from "@/lib/utils";

type SeamunConferenceLinksCtaProps = {
  /** When set, show the committee portal as a second CTA. */
  committeeSiteUrl?: string | null;
  className?: string;
  /** Slightly tighter padding for hub headers. */
  compact?: boolean;
};

/**
 * Prominent external CTAs for the SEAMUN conference website (and optional committee portal).
 */
export function SeamunConferenceLinksCta({
  committeeSiteUrl = null,
  className,
  compact = false,
}: SeamunConferenceLinksCtaProps) {
  const t = useTranslations("seamunConferenceLinks");
  const showCommittee = Boolean(committeeSiteUrl);
  let committeeHost: string | null = null;
  if (committeeSiteUrl) {
    try {
      committeeHost = new URL(committeeSiteUrl).host;
    } catch {
      committeeHost = committeeSiteUrl.replace(/^https?:\/\//, "");
    }
  }

  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-brand-navy/10 bg-gradient-to-br from-white via-[color:color-mix(in_srgb,#F2F2F7_55%,white)] to-brand-cream/40 shadow-[0_10px_28px_-22px_rgba(24,49,72,0.45)] dark:border-white/10 dark:from-zinc-900/70 dark:via-zinc-900/40 dark:to-zinc-950/30",
        compact ? "px-3.5 py-3" : "px-4 py-4 sm:px-5 sm:py-4",
        className
      )}
      aria-label={t("heading")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="font-sans text-sm font-semibold tracking-tight text-brand-navy dark:text-zinc-100 sm:text-base">
            {t("heading")}
          </h2>
          <p className="max-w-xl text-xs leading-relaxed text-brand-muted dark:text-zinc-400 sm:text-sm">
            {showCommittee ? t("intro") : t("introMainOnly")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={SEAMUN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mun-btn-primary inline-flex items-center gap-1.5 no-underline"
          >
            {t("mainSite")}
            <span aria-hidden>↗</span>
          </a>
          {showCommittee && committeeSiteUrl ? (
            <a
              href={committeeSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mun-btn-outline inline-flex items-center gap-1.5 no-underline"
            >
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span>{t("committeeSite")}</span>
                {committeeHost ? (
                  <span className="text-[0.65rem] font-medium text-brand-muted dark:text-zinc-400">
                    {t("committeeHost", { host: committeeHost })}
                  </span>
                ) : null}
              </span>
              <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
