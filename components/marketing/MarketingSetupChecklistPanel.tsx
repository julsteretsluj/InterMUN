// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import { PREVIEW_CARD } from "./marketing-preview-styles";

const STEP_LABEL_KEYS = ["step1Label", "step2Label", "step3Label", "step4Label"] as const;
const STEP_DETAIL_KEYS = ["step1Detail", "step2Detail", "step3Detail", "step4Detail"] as const;

const STEP_HREFS = [
  "/smt/conference",
  "/smt/room-codes",
  "/smt/allocation-matrix",
  "/documents",
] as const;

export function MarketingSetupChecklistPanel({ className }: { className?: string }) {
  const t = useTranslations("roleSetupChecklist.smt");

  return (
    <section className={cn(PREVIEW_CARD, className)}>
      <h2 className="font-sans text-sm font-semibold text-[var(--clicky-ink)]">{t("title")}</h2>
      <p className="mt-1 text-xs text-[var(--clicky-ink-faint)]">{t("subtitle")}</p>
      <ol className="mt-3 space-y-2">
        {STEP_HREFS.map((href, i) => (
          <li
            key={href}
            className="rounded-lg border border-[var(--clicky-line)] bg-[var(--clicky-paper)]/90 px-3 py-2"
          >
            <p className="text-xs font-medium text-[var(--clicky-ink)]">
              {i + 1}.{" "}
              <span className="text-[var(--clicky-blue)]">{t(STEP_LABEL_KEYS[i])}</span>
            </p>
            <p className="mt-0.5 text-[0.65rem] text-[var(--clicky-ink-faint)]">{t(STEP_DETAIL_KEYS[i])}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
