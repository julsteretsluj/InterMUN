// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingFeaturesDemos, type MarketingFeatureRole } from "@/components/marketing/MarketingFeaturesDemos";

const ROLE_PATH: Record<MarketingFeatureRole, string> = {
  chairs: "/features/chairs",
  delegates: "/features/delegates",
  secretariat: "/features/secretariat",
};

const FEATURE_PAGE_CTA_HREF: Record<MarketingFeatureRole, string> = {
  chairs: "/#contact",
  delegates: "/signup",
  secretariat: "/register/secretariat",
};

export async function MarketingFeaturesPage({ role }: { role: MarketingFeatureRole }) {
  const t = await getTranslations(`marketing.featuresPages.${role}`);

  return (
    <>
      <section className="border-b border-[var(--clicky-line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[1fr_0.85fr] md:px-8 md:py-24">
          <div>
            <p className="clicky-eyebrow">{t("eyebrow")}</p>
            <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.5rem)] font-bold lowercase leading-[1.02] tracking-[-0.045em] text-[var(--clicky-ink)]">
              {t("title")}{" "}
              <span className="text-[var(--clicky-blue)]">{t("titleEmphasis")}</span>
            </h1>
            <p className="clicky-lede mt-5">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={FEATURE_PAGE_CTA_HREF[role]} className="clicky-pill clicky-pill-primary">
                {t("ctaStart")}
              </Link>
              <Link href="/" className="clicky-pill clicky-pill-ghost">
                {t("ctaBack")}
              </Link>
            </div>
          </div>
          <div className="clicky-window clicky-window-lg self-end overflow-hidden md:rotate-1">
            <div className="clicky-window-bar">
              <span className="clicky-traffic" aria-hidden />
              <span className="clicky-window-title">{role}.preview</span>
            </div>
            <div className="bg-[var(--clicky-window)] p-5">
              <p className="text-sm leading-relaxed text-[var(--clicky-ink-soft)]">{t("ctaSubtitle")}</p>
              <p className="clicky-kaomoji mt-6">^ ω ^</p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFeaturesDemos role={role} />

      <section className="clicky-band border-t border-white/10 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
          <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] font-bold lowercase tracking-[-0.03em]">
            {t("ctaTitle")} {t("ctaTitleEmphasis")}
          </h2>
          <p className="clicky-on-band-soft mt-4">{t("ctaSubtitle")}</p>
          <Link href={FEATURE_PAGE_CTA_HREF[role]} className="clicky-pill clicky-pill-primary mt-8 inline-flex">
            {t("ctaStart")}
          </Link>
        </div>
      </section>

      <nav className="border-t border-[var(--clicky-line)] py-8" aria-label={t("relatedNavLabel")}>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6 px-4 text-sm lowercase text-[var(--clicky-ink-soft)] md:px-8">
          {(Object.keys(ROLE_PATH) as MarketingFeatureRole[])
            .filter((r) => r !== role)
            .map((r) => (
              <Link key={r} href={ROLE_PATH[r]} className="hover:text-[var(--clicky-blue)]">
                {t(`related.${r}`)}
              </Link>
            ))}
        </div>
      </nav>
    </>
  );
}
