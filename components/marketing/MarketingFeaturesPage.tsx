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
  secretariat: "/register/secretariat",
};

export async function MarketingFeaturesPage({ role }: { role: MarketingFeatureRole }) {
  const t = await getTranslations(`marketing.featuresPages.${role}`);

  return (
    <>
      <section className="border-b border-[var(--hairline)]">
        <div className="mx-auto max-w-[42rem] px-5 py-20 text-center md:px-10 md:py-28">
          <p className="text-[0.8125rem] font-medium text-[var(--accent)]">{t("eyebrow")}</p>
          <h1 className="mt-4 text-[length:var(--apple-text-hero-size)] font-semibold tracking-[-0.03em] text-brand-navy">
            {t("title")} <MarketingEmph>{t("titleEmphasis")}</MarketingEmph>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-brand-muted">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <MarketingFeaturesDemos role={role} />

      <section className="border-t border-[var(--hairline)]">
        <div className="mx-auto max-w-[36rem] px-5 py-20 text-center md:px-10 md:py-28">
          <h2 className="text-[length:var(--apple-text-section-size)] font-semibold tracking-[-0.025em] text-brand-navy">
            {t("ctaTitle")} <MarketingEmph>{t("ctaTitleEmphasis")}</MarketingEmph>
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-brand-muted">{t("ctaSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={FEATURE_PAGE_CTA_HREF[role]} className="mun-apple-btn mun-apple-btn-filled-blue">
              {t("ctaStart")}
            </Link>
            <Link href="/" className="mun-apple-btn mun-apple-btn-plain-gray">
              {t("ctaBack")}
            </Link>
          </div>
        </div>
      </section>

      <nav className="border-t border-[var(--hairline)] py-8" aria-label={t("relatedNavLabel")}>
        <div className="mx-auto flex max-w-[var(--content-max-width,82.5rem)] flex-wrap justify-center gap-6 px-5 text-[0.875rem] text-brand-muted md:px-10">
          {(Object.keys(ROLE_PATH) as MarketingFeatureRole[])
            .filter((r) => r !== role)
            .map((r) => (
              <Link key={r} href={ROLE_PATH[r]} className="transition-apple hover:text-[var(--accent)]">
                {t(`related.${r}`)}
              </Link>
            ))}
        </div>
      </nav>
    </>
  );
}
