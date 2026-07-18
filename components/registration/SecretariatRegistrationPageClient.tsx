// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ApplePageIntro, AppleProductPage } from "@/components/ui/AppleProductPage";
import { SecretariatRegistrationWizard } from "@/components/registration/SecretariatRegistrationWizard";

type SecretariatRegistrationPageClientProps = {
  appName: string;
};

export function SecretariatRegistrationPageClient({ appName }: SecretariatRegistrationPageClientProps) {
  const t = useTranslations("secretariatRegistration");

  return (
    <AppleProductPage width="narrow">
      <ApplePageIntro
        className="mb-8 space-y-4 md:mb-10"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        footer={
          <>
            {t("alreadyAccount")}{" "}
            <Link href="/signup" className="mun-apple-btn mun-apple-btn-plain-blue !px-0">
              {t("alreadyAccountLink")}
            </Link>
          </>
        }
      />
      <SecretariatRegistrationWizard appName={appName} />
    </AppleProductPage>
  );
}
