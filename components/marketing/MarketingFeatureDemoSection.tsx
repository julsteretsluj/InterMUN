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
  variant = "dark",
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
        "scroll-mt-24 py-14 md:py-18",
        dark
          ? "mun-marketing-role-band border-t border-white/8 text-white"
          : "border-t border-[var(--hairline)] bg-[var(--material-thin)]"
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-start gap-10 px-4 md:px-6 lg:grid-cols-2 lg:gap-14",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div>
          <p className="mun-marketing-eyebrow">{eyebrow}</p>
          <p className="mt-3 font-mono text-xs font-bold tracking-[0.14em] text-[var(--accent)]">{index}</p>
          <h2
            className={cn(
              "mun-display mt-2 text-2xl md:text-3xl",
              dark ? "text-white" : "text-brand-navy"
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-4 text-base leading-relaxed md:text-lg",
              dark ? "text-white/70" : "text-brand-muted"
            )}
          >
            {description}
          </p>
          {bullets && bullets.length > 0 ? (
            <ul className={cn("mt-6 space-y-2 text-sm md:text-base", dark ? "text-white/75" : "text-brand-muted")}>
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
