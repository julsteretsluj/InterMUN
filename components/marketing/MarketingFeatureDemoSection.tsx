// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { MarketingChamberFrame } from "@/components/marketing/MarketingChamberFrame";
import { cn } from "@/lib/utils";

export function MarketingFeatureDemoSection({
  id,
  index: _index,
  eyebrow,
  title,
  description,
  bullets,
  previewLabel,
  preview,
  reversed,
  dark: _dark,
  variant: _variant = "light",
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  previewLabel: string;
  preview: ReactNode;
  reversed?: boolean;
  /** @deprecated Sections are always light. */
  dark?: boolean;
  /** @deprecated Previews always use light chamber chrome. */
  variant?: "dark" | "light";
}) {
  const shownBullets = bullets?.slice(0, 2) ?? [];

  return (
    <section id={id} className="scroll-mt-24 py-20 md:py-28">
      <div
        className={cn(
          "mx-auto grid max-w-[var(--content-max-width,82.5rem)] items-center gap-12 px-5 md:px-10 lg:grid-cols-2 lg:gap-20",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div className="max-w-xl">
          <p className="text-[0.8125rem] font-medium tracking-[-0.01em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="mt-3 text-[length:var(--apple-text-section-size)] font-semibold tracking-[-0.025em] text-brand-navy">
            {title}
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-[1.55] text-brand-muted">{description}</p>
          {shownBullets.length > 0 ? (
            <ul className="mt-8 space-y-3">
              {shownBullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-[0.9375rem] leading-snug text-brand-navy/80">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <MarketingChamberFrame label={previewLabel}>{preview}</MarketingChamberFrame>
      </div>
    </section>
  );
}
