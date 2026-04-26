"use client";

import { useTranslations } from "next-intl";
import type { RubricCriterion } from "@/lib/seamuns-award-scoring";
import { DELEGATE_CRITERIA, PAPER_CRITERIA } from "@/lib/seamuns-award-scoring";
import {
  BEST_COMMITTEE_RUBRIC,
  CHAIR_PERFORMANCE_RUBRIC,
  CHAIR_REPORT_OVERALL_RUBRIC,
  CHAIR_REPORT_SECTION_RUBRIC,
  SEAMUN_AWARD_OVERVIEW_PARAGRAPHS,
  SEAMUN_AWARDS_PROCESS_SECTIONS,
  SEAMUN_CHAIR_TRAINING_GUIDE,
  SEAMUN_COLLECTIVE_CHAIR_AWARDS,
  SEAMUN_COMMITTEE_LEVEL_AWARDS,
  SEAMUN_CONFERENCE_WIDE_AWARDS,
} from "@/lib/seamun-awards-rubric-guide";
import { cn } from "@/lib/utils";

function RubricMatrix({
  title,
  criteria,
  maxPoints,
  footnote,
}: {
  title: string;
  criteria: RubricCriterion[];
  maxPoints: number;
  footnote?: string;
}) {
  const t = useTranslations("awardsRubric");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">{title}</h4>
        <span className="font-mono text-xs text-brand-muted dark:text-discord-muted">Max {maxPoints} pts</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-brand-navy/10 bg-white/60 shadow-sm dark:border-white/10 dark:bg-discord-elevated/60">
        <table className="min-w-[720px] w-full border-collapse text-left text-xs text-brand-navy dark:text-zinc-200">
          <thead>
            <tr className="border-b border-brand-navy/10 bg-brand-cream/80 dark:border-white/10 dark:bg-zinc-900/80">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[9rem] border-r border-brand-navy/10 bg-brand-cream px-3 py-2.5 font-semibold dark:border-white/10 dark:bg-zinc-900"
              >
                {t("criteriaHeader")}
              </th>
              {[0, 1, 2, 3].map((i) => (
                <th key={i} scope="col" className="min-w-[11rem] px-3 py-2.5 font-semibold text-brand-muted dark:text-discord-muted">
                  {t(`bandHeaders.${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((row, i) => {
              const stripe = i % 2 === 0;
              return (
                <tr
                  key={row.key}
                  className={cn(
                    "border-b border-brand-navy/5 dark:border-white/5",
                    stripe ? "bg-white/40 dark:bg-zinc-950/40" : "bg-brand-cream/30 dark:bg-zinc-900/40"
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-10 border-r border-brand-navy/10 px-3 py-2.5 align-top font-medium text-brand-navy dark:border-white/10 dark:text-zinc-100",
                      stripe ? "bg-white/95 dark:bg-zinc-950/95" : "bg-brand-cream/95 dark:bg-zinc-900/95"
                    )}
                  >
                    {t(`criteria.${row.key}.label`)}
                  </th>
                  {row.bandDescriptions.map((_, j) => (
                    <td key={`${row.key}-${j}`} className="px-3 py-2.5 align-top text-[0.8rem] leading-snug text-brand-navy/95 dark:text-zinc-300">
                      {t(`criteria.${row.key}.bands.${j}`)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footnote ? <p className="text-[0.7rem] leading-relaxed text-brand-muted dark:text-discord-muted">{footnote}</p> : null}
    </div>
  );
}

function AwardList({
  heading,
  items,
}: {
  heading: string;
  items: { title: string; description: string }[];
}) {
  return (
    <div>
      <h4 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-discord-muted">
        {heading}
      </h4>
      <ul className="list-inside list-disc space-y-1.5 text-sm text-brand-navy dark:text-zinc-200">
        {items.map((a) => (
          <li key={a.title}>
            <span className="font-medium text-brand-navy dark:text-zinc-100">{a.title}: </span>
            {a.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full SEAMUN rubric matrices and award reference copy (chairs + SMT). */
export function AwardsRubricReference() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-navy/10 bg-logo-cyan/10 p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">SEAMUN I official award rubrics</h2>
        <p className="mt-1 text-xs leading-relaxed text-brand-muted dark:text-discord-muted">
          Reference copy: award types, evaluation process, and full 1–8 band matrices (from the conference rubric).
          Scoring in InterMUN uses the same criterion keys where nominations are submitted.
        </p>
      </section>

      <details className="group rounded-xl border border-brand-navy/10 bg-brand-paper/80 open:shadow-sm dark:border-white/10 dark:bg-discord-elevated/40">
        <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-semibold text-brand-navy marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-brand-accent transition-transform duration-200 group-open:rotate-90 dark:text-brand-accent-bright">
            ▸
          </span>
          Award catalogue
        </summary>
        <div className="space-y-5 border-t border-brand-navy/10 px-4 pb-4 pt-3 dark:border-white/10">
          {SEAMUN_AWARD_OVERVIEW_PARAGRAPHS.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-brand-navy dark:text-zinc-200">
              {p}
            </p>
          ))}
          <AwardList heading="Conference-wide (overall)" items={SEAMUN_CONFERENCE_WIDE_AWARDS} />
          <AwardList heading="Collective & chair" items={SEAMUN_COLLECTIVE_CHAIR_AWARDS} />
          <AwardList heading="Committee-level" items={SEAMUN_COMMITTEE_LEVEL_AWARDS} />
        </div>
      </details>

      <details className="group rounded-xl border border-brand-navy/10 bg-brand-paper/80 open:shadow-sm dark:border-white/10 dark:bg-discord-elevated/40">
        <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-semibold text-brand-navy marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-brand-accent transition-transform duration-200 group-open:rotate-90 dark:text-brand-accent-bright">
            ▸
          </span>
          Awards process & oversight
        </summary>
        <div className="space-y-4 border-t border-brand-navy/10 px-4 pb-4 pt-3 dark:border-white/10">
          {SEAMUN_AWARDS_PROCESS_SECTIONS.map((s) => (
            <div key={s.title}>
              <h4 className="font-display text-sm font-semibold text-brand-navy dark:text-zinc-100">{s.title}</h4>
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="mt-1 text-sm text-brand-navy dark:text-zinc-300">
                  {p}
                </p>
              ))}
              {s.bullets ? (
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-brand-navy dark:text-zinc-300">
                  {s.bullets.map((b, k) => (
                    <li key={k}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </details>

      <RubricMatrix title="Position paper (Best Position Paper)" criteria={PAPER_CRITERIA} maxPoints={40} />

      <p className="text-xs text-brand-muted dark:text-discord-muted">
        Chairs complete evidence and written confirmation for SMT records: primary evidence of excellence and
        justification vs runner-up (per published form).
      </p>

      <RubricMatrix
        title="Delegate (live sessions)"
        criteria={DELEGATE_CRITERIA}
        maxPoints={48}
        footnote="Creativity, diplomacy, collaboration, leadership, knowledge & research, participation — 8 pts each."
      />

      <RubricMatrix
        title="Chair performance"
        criteria={CHAIR_PERFORMANCE_RUBRIC}
        maxPoints={64}
        footnote="Eight dimensions scored at 8 pts each for Best Chair / chair evaluation alignment."
      />

      <RubricMatrix title="Chair report — overall" criteria={CHAIR_REPORT_OVERALL_RUBRIC} maxPoints={32} />

      <RubricMatrix
        title="Chair report — section-specific"
        criteria={CHAIR_REPORT_SECTION_RUBRIC}
        maxPoints={40}
        footnote="Combined with overall section above for a total chair report score up to 72 on the extended scale in the official document."
      />

      <RubricMatrix title="Best committee" criteria={BEST_COMMITTEE_RUBRIC} maxPoints={32} />

      <details className="group rounded-xl border border-brand-navy/10 bg-brand-paper/80 open:shadow-sm dark:border-white/10 dark:bg-discord-elevated/40">
        <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-semibold text-brand-navy marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-brand-accent transition-transform duration-200 group-open:rotate-90 dark:text-brand-accent-bright">
            ▸
          </span>
          Chair calibration & training (1–8 scale)
        </summary>
        <div className="space-y-4 border-t border-brand-navy/10 px-4 pb-4 pt-3 dark:border-white/10">
          {SEAMUN_CHAIR_TRAINING_GUIDE.map((block) => (
            <div key={block.title}>
              <h4 className="font-display text-sm font-semibold text-brand-navy dark:text-zinc-100">{block.title}</h4>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-brand-navy dark:text-zinc-300">
                {block.bullets.map((b, k) => (
                  <li key={k}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
