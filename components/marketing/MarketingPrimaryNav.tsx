// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AppleMenu,
  AppleMenuContent,
  AppleMenuItem,
  AppleMenuTrigger,
} from "@/components/ui/AppleMenu";

/** Marketing header: collapse role feature links into one Features menu. */
export function MarketingFeaturesMenu() {
  const t = useTranslations("marketing");
  const router = useRouter();

  return (
    <AppleMenu>
      <AppleMenuTrigger
        aria-label={t("nav.features")}
        className="marketing-nav-link rounded-[var(--radius-md)] px-2 py-1 text-sm font-medium"
      >
        {t("nav.features")}
      </AppleMenuTrigger>
      <AppleMenuContent align="end" className="min-w-[11rem]">
        <AppleMenuItem label={t("nav.chairs")} onSelect={() => router.push("/features/chairs")} />
        <AppleMenuItem label={t("nav.delegates")} onSelect={() => router.push("/features/delegates")} />
        <AppleMenuItem
          label={t("nav.secretariat")}
          onSelect={() => router.push("/features/secretariat")}
        />
      </AppleMenuContent>
    </AppleMenu>
  );
}

export function MarketingPrimaryNav() {
  const t = useTranslations("marketing");

  return (
    <nav className="marketing-nav hidden items-center justify-self-center gap-1 lg:flex lg:gap-2">
      <Link href="/about">About</Link>
      <Link href="/#how-it-works">{t("nav.howItWorks")}</Link>
      <MarketingFeaturesMenu />
      <Link href="/#contact">{t("nav.contact")}</Link>
    </nav>
  );
}
