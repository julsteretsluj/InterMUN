// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";

export type MarketingDocumentSection = {
  title: string;
  content: ReactNode;
};

export function MarketingDocumentPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  sections: MarketingDocumentSection[];
}) {
  return (
    <>
      <section className="mun-marketing-hero relative overflow-hidden border-b border-[color:var(--marketing-hairline)]">
        <div className="mun-marketing-rainbow-bar absolute inset-x-0 top-0" aria-hidden />
        <div className="mun-marketing-hero-copy mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
          <p className="mun-marketing-eyebrow">{eyebrow}</p>
          <h1 className="mun-display mt-4 text-4xl md:text-5xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed md:text-lg">{intro}</p>
          {updated ? (
            <p className="mt-4 font-mono text-xs uppercase tracking-wider text-[color:var(--marketing-ink-soft)]">
              Last updated: {updated}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mun-marketing-surface">
        <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
          <div className="space-y-10">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-3xl border border-[color:var(--marketing-glass-line)] bg-[color:var(--marketing-glass-fill)] p-6 shadow-sm backdrop-blur-sm md:p-8"
              >
                <h2 className="mun-display text-2xl md:text-3xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[color:var(--marketing-ink-soft)] md:text-base">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
