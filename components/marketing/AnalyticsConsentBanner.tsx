// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

export function AnalyticsConsentBanner() {
  const t = useTranslations("marketing.analyticsConsent");
  const [choice, setChoice] = useState<AnalyticsConsent | null | undefined>(undefined);

  useEffect(() => {
    setChoice(readAnalyticsConsent());
  }, []);

  if (choice !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="case-preserve mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[#D1D1D6] bg-white p-4 text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:gap-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#6E6E73]">
          {t.rich("body", {
            privacy: (chunks) => (
              <Link href="/privacy" className="font-semibold text-[#007AFF] hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              writeAnalyticsConsent("denied");
              setChoice("denied");
            }}
            className="rounded-full border border-[#D1D1D6] bg-[#F2F2F7] px-4 py-2 text-sm font-semibold text-[#1D1D1F]"
          >
            {t("decline")}
          </button>
          <button
            type="button"
            onClick={() => {
              writeAnalyticsConsent("granted");
              setChoice("granted");
            }}
            className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
