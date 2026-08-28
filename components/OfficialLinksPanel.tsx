// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SeamunConferenceLinksCta } from "@/components/SeamunConferenceLinksCta";
import {
  OFFICIAL_LINK_CATEGORIES,
  officialLinkCategoryDisplayCount,
} from "@/lib/official-un-links";
import { cn } from "@/lib/utils";

export function OfficialLinksPanel({
  committeeSiteUrl = null,
}: {
  /** When set (chairs/delegates with a mapped chamber), show the committee portal CTA. */
  committeeSiteUrl?: string | null;
}) {
  const t = useTranslations("officialLinks");

  return (
    <>
      <SeamunConferenceLinksCta committeeSiteUrl={committeeSiteUrl} className="mb-8" />
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-brand-muted dark:text-zinc-400">
        {t("intro")}
      </p>
      <ul className="grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {OFFICIAL_LINK_CATEGORIES.map((category, index) => {
          const stagger = (index % 3) + 1;
          const linkCount = officialLinkCategoryDisplayCount(category, {
            committeeSiteUrl,
          });
          return (
            <li key={category.id}>
              <Link
                href={`/official-links/${category.id}`}
                className={cn(
                  "mun-lift mun-animate-rise group flex h-full min-h-[7rem] flex-col rounded-[var(--radius-md)] border border-[#D1D1D6] bg-[color-mix(in_srgb,#FBFBFD_88%,white)] px-5 py-5 shadow-[var(--dashboard-shadow)] transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-apple-out)] hover:-translate-y-1 hover:border-[color-mix(in_srgb,#007AFF_35%,#D1D1D6)] hover:shadow-[var(--dashboard-shadow-hover)] dark:border-zinc-700 dark:bg-zinc-900/60",
                  stagger === 1 && "mun-animate-delay-1",
                  stagger === 2 && "mun-animate-delay-2",
                  stagger === 3 && "mun-animate-delay-3"
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {category.emoji ? (
                      <span aria-hidden className="text-xl leading-none">
                        {category.emoji}
                      </span>
                    ) : null}
                    <span className="font-sans text-[1.02rem] font-semibold tracking-[-0.01em] text-brand-navy dark:text-zinc-50">
                      {t(`groups.${category.labelKey}`)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 translate-x-0 text-brand-muted opacity-0 transition-all duration-[var(--dur-base)] ease-[var(--ease-apple)] group-hover:translate-x-0.5 group-hover:text-[#007AFF] group-hover:opacity-100 dark:text-zinc-500"
                  >
                    →
                  </span>
                </span>
                <span className="mt-2 text-xs leading-relaxed text-brand-muted dark:text-zinc-400">
                  {t(`categoryHints.${category.hintKey}`)}
                </span>
                <span className="mt-auto pt-4 text-[0.7rem] font-medium uppercase tracking-[0.06em] text-[#6E6E73] dark:text-zinc-500">
                  {t("linkCount", { count: linkCount })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
