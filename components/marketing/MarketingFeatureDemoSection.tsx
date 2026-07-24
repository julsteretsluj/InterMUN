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
  dark,
  variant = "light",
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
  dark?: boolean;
  variant?: "dark" | "light";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 py-12 md:py-12",
        dark
          ? "mun-marketing-role-band mun-marketing-section-dark border-t border-[color:var(--marketing-hairline)] text-[color:var(--marketing-ink)]"
          : "mun-marketing-surface border-t border-[var(--hairline)]"
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-start gap-8 px-4 md:px-6 lg:grid-cols-2 lg:gap-12",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div>
          <p className="mun-marketing-eyebrow">{eyebrow}</p>
          <p className="mt-3 font-sans text-xs font-bold tracking-[0.14em] text-[var(--accent)]">{index}</p>
          <h2
            className={cn(
              "mun-display mt-2 text-2xl md:text-3xl",
              dark ? "text-[color:var(--marketing-ink)]" : "text-brand-navy"
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-4 text-base leading-relaxed md:text-lg",
              dark ? "text-[color:var(--marketing-ink-soft)]" : "text-brand-muted"
            )}
          >
            {description}
          </p>
          {bullets && bullets.length > 0 ? (
            <ul
              className={cn(
                "mt-6 space-y-2 text-sm md:text-base",
                dark ? "text-[color:var(--marketing-ink-soft)]" : "text-brand-muted"
              )}
            >
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
        <MarketingChamberFrame label={previewLabel} variant={variant}>
          {preview}
        </MarketingChamberFrame>
      </div>
    </section>
  );
}
