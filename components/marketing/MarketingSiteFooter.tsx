// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPartnershipContactEmail } from "@/lib/branding";

export async function MarketingSiteFooter() {
  const t = await getTranslations("marketing");
  const contactEmail = getPartnershipContactEmail();

  return (
    <footer className="relative z-10 border-t border-[var(--hairline)] bg-[var(--marketing-chamber-elevated)] py-10">
      <div className="mx-auto flex max-w-[var(--content-max-width,82.5rem)] flex-col items-start justify-between gap-6 px-4 text-sm text-brand-muted md:flex-row md:items-center md:px-8">
        <p className="font-heading text-sm font-medium tracking-[-0.02em] text-brand-navy">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
        <nav
          aria-label="Company and legal"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-xs tracking-wide"
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
