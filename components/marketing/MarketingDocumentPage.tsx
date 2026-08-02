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
        <div className="mun-marketing-hero-copy mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20 md:pl-10">
          <p className="mun-marketing-eyebrow">{eyebrow}</p>
          <h1 className="font-sans mt-4 text-4xl font-semibold tracking-[-0.035em] md:text-5xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[color:var(--marketing-ink-soft)] md:text-lg">{intro}</p>
          {updated ? (
            <p className="mt-4 font-mono text-xs uppercase tracking-wider text-[color:var(--marketing-ink-soft)]">
              Last updated: {updated}
            </p>
          ) : null}
        </div>
      </section>

      <section className="bg-[var(--marketing-chamber-deep)]">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
          <div className="space-y-8">
            {sections.map((section, i) => (
              <section
                key={section.title}
                className={`rounded-[var(--radius-xl)] border border-[color:var(--marketing-hairline)] bg-white p-6 shadow-[var(--dashboard-shadow)] md:p-8 ${
                  i % 2 === 1 ? "md:ml-6 md:mr-0" : "md:mr-6"
                }`}
              >
                <h2 className="font-sans text-2xl font-semibold tracking-[-0.03em] md:text-3xl">{section.title}</h2>
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
