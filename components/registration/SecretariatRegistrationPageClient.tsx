// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SecretariatRegistrationWizard } from "@/components/registration/SecretariatRegistrationWizard";

type SecretariatRegistrationPageClientProps = {
  appName: string;
};

export function SecretariatRegistrationPageClient({ appName }: SecretariatRegistrationPageClientProps) {
  const t = useTranslations("secretariatRegistration");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <header className="mb-8 space-y-4 md:mb-10">
          <p className="mun-apple-text mun-apple-text-caption-2-emphasized uppercase tracking-[0.22em] text-[var(--accent)]">
            {t("eyebrow")}
          </p>
          <h1 className="mun-apple-text mun-apple-text-large-title-emphasized">{t("title")}</h1>
          <p className="mun-apple-text mun-apple-text-body mun-vibrancy-secondary max-w-2xl">{t("subtitle")}</p>
          <p className="mun-apple-text mun-apple-text-subheadline">
            {t("alreadyAccount")}{" "}
            <Link href="/signup" className="mun-apple-btn mun-apple-btn-plain-blue !px-0">
              {t("alreadyAccountLink")}
            </Link>
          </p>
        </header>
        <SecretariatRegistrationWizard appName={appName} />
    </div>
  );
}
