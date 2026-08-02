// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppleGateLayout } from "@/components/ui/AppleGateLayout";

export default async function NotFound() {
  const t = await getTranslations("notFoundPage");

  return (
    <AppleGateLayout>
      <div className="relative flex flex-col items-start gap-3 py-6 text-left md:py-8">
        <span className="mun-accent-doodle right-4 top-2" aria-hidden />
        <p className="font-mono text-xs tracking-[0.16em] text-brand-muted">404</p>
        <h1 className="font-sans text-2xl font-semibold tracking-[-0.03em] text-brand-navy md:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-sm text-[1.0625rem] leading-relaxed text-brand-muted">{t("description")}</p>
        <Link href="/" className="mun-apple-btn mun-apple-btn-filled-blue mt-3">
          {t("backToHome")}
        </Link>
      </div>
    </AppleGateLayout>
  );
}
