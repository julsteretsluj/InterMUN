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
  dark?: boolean;
  variant?: "dark" | "light";
}) {
  const shownBullets = bullets?.slice(0, 2) ?? [];

  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-[var(--clicky-line)] py-16 md:py-24"
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div className={cn("max-w-xl", reversed && "lg:pl-4")}>
          <p className="clicky-eyebrow">{eyebrow}</p>
          <h2 className="clicky-section-title mt-3 normal-case">{title}</h2>
          <p className="clicky-lede mt-4">{description}</p>
          {shownBullets.length > 0 ? (
            <ul className="mt-8 space-y-3">
              {shownBullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex gap-3 text-[0.9375rem] leading-snug text-[var(--clicky-ink-soft)]"
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--clicky-blue)]"
                    aria-hidden
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={cn(reversed ? "lg:-rotate-1" : "lg:rotate-1")}>
          <MarketingChamberFrame label={previewLabel}>{preview}</MarketingChamberFrame>
        </div>
      </div>
    </section>
  );
}
