// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { MarketingChamberFrame } from "@/components/marketing/MarketingChamberFrame";
import { cn } from "@/lib/utils";

export function MarketingFeatureDemoSection({
  id,
  index,
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
  return (
    <section
      id={id}
      className="mun-marketing-surface scroll-mt-24 border-t border-[var(--hairline)] py-16 md:py-24"
    >
      <div
        className={cn(
          "mx-auto grid max-w-[var(--content-max-width,82.5rem)] items-start gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div>
          <p className="mun-marketing-eyebrow text-[var(--accent)]">{eyebrow}</p>
          <p className="mt-3 font-sans text-xs font-bold tracking-[0.14em] text-[var(--accent)]">{index}</p>
          <h2 className="mun-display mt-2 text-2xl text-brand-navy md:text-3xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{description}</p>
          {bullets && bullets.length > 0 ? (
            <ul className="mt-6 space-y-2 text-sm text-brand-muted md:text-base">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-[var(--accent)]" aria-hidden>
                    ›
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <MarketingChamberFrame label={previewLabel} variant="light">
          {preview}
        </MarketingChamberFrame>
      </div>
    </section>
  );
}
