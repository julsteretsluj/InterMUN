// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppleGateLayout } from "@/components/ui/AppleGateLayout";

export default async function NotFound() {
  const t = await getTranslations("notFoundPage");

  return (
    <AppleGateLayout>
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="mun-apple-text mun-apple-text-caption-1 mun-vibrancy-tertiary font-mono">404</p>
        <h1 className="mun-apple-text mun-apple-text-title-2">{t("title")}</h1>
        <p className="mun-apple-text mun-apple-text-body mun-vibrancy-secondary max-w-sm">
          {t("description")}
        </p>
        <Link href="/" className="mun-apple-btn mun-apple-btn-filled-blue mt-2">
          {t("backToHome")}
        </Link>
      </div>
    </AppleGateLayout>
  );
}
