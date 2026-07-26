// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPartnershipContactEmail } from "@/lib/branding";

export async function MarketingSiteFooter() {
  const t = await getTranslations("marketing");
  const contactEmail = getPartnershipContactEmail();

  return (
    <footer className="mun-marketing-surface relative z-10 border-t border-[var(--hairline)] py-8">
      <div className="mx-auto flex max-w-[var(--content-max-width,82.5rem)] flex-col items-center justify-between gap-4 px-4 text-sm text-brand-muted md:flex-row md:px-6">
        <p className="font-sans text-xs tracking-wide">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
        <nav
          aria-label="Company and legal"
          className="flex flex-wrap items-center justify-center gap-4 font-sans text-xs uppercase tracking-wider"
        >
          <Link href="/about" className="hover:text-brand-navy">
            About
          </Link>
          <Link href="/privacy" className="hover:text-brand-navy">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-brand-navy">
            Terms
          </Link>
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} className="hover:text-brand-navy">
              {t("footer.contact")}
            </a>
          ) : null}
          <Link href="/login" className="hover:text-brand-navy">
            {t("nav.signIn")}
          </Link>
          <Link href="/signup" className="hover:text-brand-navy">
            {t("nav.getStarted")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
