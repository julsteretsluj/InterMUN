// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

export type MarketingDocumentSection = {
  title: string;
  content: ReactNode;
};

export async function MarketingDocumentPage({
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
  const t = await getTranslations("marketing.documentPage");

  return (
    <>
      <section className="clicky-doc-hero border-b border-[var(--clicky-line)]">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="clicky-doc-grid">
            <div>
              <p className="clicky-eyebrow">{eyebrow.toLowerCase()}</p>
              <h1 className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] font-bold lowercase leading-[1.05] tracking-[-0.04em] text-[var(--clicky-ink)]">
                {title}
              </h1>
            </div>
            <div>
              <p className="clicky-lede text-[1.1rem]">{intro}</p>
              {updated ? (
                <p className="mt-4 font-mono text-[0.7rem] tracking-wider text-[var(--clicky-ink-faint)]">
                  {t("lastUpdated", { date: updated })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          {sections.map((section, i) => (
            <article
              key={section.title}
              className={`clicky-doc-card ${i % 2 === 1 ? "md:ml-8" : "md:mr-8"}`}
            >
              <h2 className="text-xl font-bold lowercase tracking-[-0.03em] md:text-2xl">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--clicky-ink-soft)] md:text-base">
                {section.content}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
