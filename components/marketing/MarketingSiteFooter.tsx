// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { getAppName, getPartnershipContactEmail } from "@/lib/branding";

export async function MarketingSiteFooter() {
  const t = await getTranslations("marketing");
  const contactEmail = getPartnershipContactEmail();
  const appName = getAppName();

  return (
    <footer className="clicky-band relative z-10 border-t border-white/10 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <InterMunEmblem alt="" className="max-h-8 w-auto" surface="dark" />
            <p className="case-preserve text-lg font-bold tracking-[-0.03em]">{appName}</p>
          </div>
          <p className="clicky-on-band-soft mt-2 max-w-xs text-sm leading-relaxed">{t("footer.tagline")}</p>
          <p className="clicky-on-band-faint mt-6 text-xs">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
        <div>
          <p className="clicky-on-band-faint text-xs font-semibold tracking-[0.08em]">{t("footer.product")}</p>
          <nav className="clicky-on-band-soft mt-3 flex flex-col gap-2 text-sm">
            <Link href="/#how-it-works" className="hover:text-white">
              {t("footer.howItWorks")}
            </Link>
            <Link href="/features/chairs" className="hover:text-white">
              {t("nav.chairs")}
            </Link>
            <Link href="/features/delegates" className="hover:text-white">
              {t("nav.delegates")}
            </Link>
            <Link href="/features/secretariat" className="hover:text-white">
              {t("nav.secretariat")}
            </Link>
          </nav>
        </div>
        <div>
          <p className="clicky-on-band-faint text-xs font-semibold tracking-[0.08em]">{t("footer.resources")}</p>
          <nav className="clicky-on-band-soft mt-3 flex flex-col gap-2 text-sm">
            <Link href="/about" className="hover:text-white">
              {t("nav.about")}
            </Link>
            <Link href="/privacy" className="hover:text-white">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-white">
              {t("footer.terms")}
            </Link>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="hover:text-white">
                {t("footer.contact")}
              </a>
            ) : null}
            <Link href="/login" className="hover:text-white">
              {t("nav.signIn")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
