// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { OfficialLinkCategoryDef, OfficialLinkDef } from "@/lib/official-un-links";

function groupedLinks(links: OfficialLinkDef[]): { heading: string | null; links: OfficialLinkDef[] }[] {
  const groups: { heading: string | null; links: OfficialLinkDef[] }[] = [];
  for (const link of links) {
    const heading = link.group?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) {
      last.links.push(link);
    } else {
      groups.push({ heading, links: [link] });
    }
  }
  return groups;
}

export function OfficialLinksCategoryLibrary({
  category,
}: {
  category: OfficialLinkCategoryDef;
}) {
  const t = useTranslations("officialLinks");
  const groups = groupedLinks(category.links);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/official-links"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#35516B] underline decoration-[#C9DDE9] underline-offset-4 transition-colors hover:text-brand-navy hover:decoration-[#119ED3] dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← {t("backToCategories")}
        </Link>
        <p className="text-xs text-brand-muted dark:text-zinc-500">{t("libraryIntro")}</p>
      </div>

      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-brand-muted dark:text-zinc-400">
        {t(`categoryHints.${category.hintKey}`)}
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.heading ?? "default"}>
            {group.heading ? (
              <h3 className="mb-2 font-sans text-sm font-semibold text-brand-navy dark:text-zinc-100">
                {group.heading}
              </h3>
            ) : null}
            <ul className="divide-y divide-[#C9DDE9] overflow-hidden rounded-[var(--radius-md)] border border-[#C9DDE9] bg-[color-mix(in_srgb,#F8FBFF_92%,white)] dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50">
              {group.links.map((link) => {
                const description =
                  link.descriptionKey != null ? t(`linkDescriptions.${link.descriptionKey}`) : null;
                const label = link.title ?? t(`links.${link.linkKey}`);
                return (
                  <li key={`${link.linkKey}-${link.href}`}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-[color-mix(in_srgb,#119ED3_6%,transparent)] sm:flex-row sm:items-start sm:justify-between sm:gap-6 dark:hover:bg-zinc-800/70"
                    >
                      <span className="min-w-0">
                        <span className="font-sans text-sm font-semibold text-brand-navy group-hover:text-[#17324A] dark:text-zinc-50">
                          {label}
                          <span aria-hidden className="ml-1.5 text-brand-muted opacity-70">
                            ↗
                          </span>
                        </span>
                        {description ? (
                          <span className="mt-1 block text-xs leading-relaxed text-brand-muted dark:text-zinc-400">
                            {description}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 break-all font-mono text-[0.7rem] text-[#4D6174] sm:max-w-[42%] sm:text-right dark:text-zinc-500">
                        {link.href.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
