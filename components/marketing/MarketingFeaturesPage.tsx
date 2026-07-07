// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingEmph } from "@/components/marketing/MarketingEmph";
import { MarketingFeaturesDemos, type MarketingFeatureRole } from "@/components/marketing/MarketingFeaturesDemos";

const ROLE_PATH: Record<MarketingFeatureRole, string> = {
  chairs: "/features/chairs",
  delegates: "/features/delegates",
  secretariat: "/features/secretariat",
};

/** Hosting requires a partnership inquiry — delegates still self-serve via signup. */
const FEATURE_PAGE_CTA_HREF: Record<MarketingFeatureRole, string> = {
  chairs: "/#contact",
  delegates: "/signup",
  secretariat: "/#contact",
};

export async function MarketingFeaturesPage({ role }: { role: MarketingFeatureRole }) {
  const t = await getTranslations(`marketing.featuresPages.${role}`);

  return (
    <>
      <section className="mun-marketing-hero relative overflow-hidden border-b border-white/10">
        <div className="mun-marketing-rainbow-bar absolute inset-x-0 top-0" aria-hidden />
        <div className="mun-marketing-hero-copy mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-18">
          <p className="mun-marketing-eyebrow">{t("eyebrow")}</p>
          <h1 className="mun-display mt-4 text-4xl md:text-5xl">
            {t("title")} <MarketingEmph>{t("titleEmphasis")}</MarketingEmph>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed md:text-lg">{t("subtitle")}</p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">{t("intro")}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="mun-procedure-chip">{t("chip1")}</span>
            <span className="mun-procedure-chip">{t("chip2")}</span>
            <span className="mun-procedure-chip">{t("chip3")}</span>
          </div>
        </div>
      </section>

      <MarketingFeaturesDemos role={role} />

      <section className="mun-marketing-hero relative overflow-hidden border-t border-white/10 py-16 md:py-20">
        <div className="mun-marketing-rainbow-bar absolute inset-x-0 top-0" aria-hidden />
        <div className="mun-marketing-hero-copy mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="mun-display text-3xl md:text-4xl">
            {t("ctaTitle")} <MarketingEmph>{t("ctaTitleEmphasis")}</MarketingEmph>
          </h2>
          <p className="mt-4 text-base leading-relaxed md:text-lg">{t("ctaSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={FEATURE_PAGE_CTA_HREF[role]} className="mun-btn-gold rounded-full px-7 py-3 text-base font-bold">
              {t("ctaStart")} →
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-white/8 px-7 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/12"
            >
              {t("ctaBack")}
            </Link>
          </div>
        </div>
      </section>

      <nav
        className="border-t border-[var(--hairline)] bg-[var(--material-thin)] py-6"
        aria-label={t("relatedNavLabel")}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 px-4 font-sans text-xs uppercase tracking-wider md:px-6">
          {(Object.keys(ROLE_PATH) as MarketingFeatureRole[])
            .filter((r) => r !== role)
            .map((r) => (
              <Link key={r} href={ROLE_PATH[r]} className="text-brand-muted hover:text-[var(--accent)]">
                {t(`related.${r}`)}
              </Link>
            ))}
        </div>
      </nav>
    </>
  );
}
