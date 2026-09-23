// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { cn } from "@/lib/utils";

import { PREVIEW_CARD } from "./marketing-preview-styles";

/** Static marketing preview — avoids depending on sliced app i18n namespaces. */
const STEPS = [
  {
    label: "Confirm event + committee sessions",
    detail: "Validate names, tags, chair names, and crisis links.",
  },
  {
    label: "Set room codes + chair access",
    detail: "Ensure each committee has correct gate codes.",
  },
  {
    label: "Prepare allocations + sign-in docs",
    detail: "Import seats, then set passwords/codes.",
  },
  {
    label: "Publish global docs (RoP / criteria)",
    detail: "Upload common references for all users.",
  },
] as const;

export function MarketingSetupChecklistPanel({ className }: { className?: string }) {
  return (
    <section className={cn(PREVIEW_CARD, className)}>
      <h2 className="font-sans text-sm font-semibold text-[var(--clicky-ink)]">
        SMT setup checklist
      </h2>
      <p className="mt-1 text-xs text-[var(--clicky-ink-faint)]">
        Conference-wide controls before chairs and delegates enter.
      </p>
      <ol className="mt-3 space-y-2">
        {STEPS.map((step, i) => (
          <li
            key={step.label}
            className="rounded-lg border border-[var(--clicky-line)] bg-[var(--clicky-paper)]/90 px-3 py-2"
          >
            <p className="text-xs font-medium text-[var(--clicky-ink)]">
              {i + 1}. <span className="text-[var(--clicky-blue)]">{step.label}</span>
            </p>
            <p className="mt-0.5 text-[0.65rem] text-[var(--clicky-ink-faint)]">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
