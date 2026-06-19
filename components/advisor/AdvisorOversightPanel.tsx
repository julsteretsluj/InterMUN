"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { AdvisorAssignmentRow } from "@/lib/advisor-access";
import { groupAdvisorDelegatesByDifficultyAndCommittee } from "@/lib/advisor-delegate-grouping";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { difficultyTagClass } from "@/lib/committee-tag-styles";
import { translateCommitteeTagDifficulty } from "@/lib/i18n/committee-display-tags";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";

function DelegateCard({ assignment }: { assignment: AdvisorAssignmentRow }) {
  const t = useTranslations("advisorDashboard");
  const flag = flagEmojiForCountryName(assignment.delegate_country);

  return (
    <li className="rounded-xl border border-brand-navy/10 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex min-w-0 items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {flag}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-brand-navy dark:text-zinc-100">{assignment.delegate_country}</h2>
          {assignment.delegate_name ? (
            <p className="mt-0.5 text-sm text-brand-navy/90 dark:text-zinc-200">{assignment.delegate_name}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-brand-muted">
        {assignment.delegate_user_id ? t("delegateLinked") : t("delegateNotLinked")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {assignment.delegate_user_id ? (
          <>
            <Link
              href={`/advisor/delegates/${encodeURIComponent(assignment.delegate_user_id)}`}
              className="text-xs font-medium text-brand-accent hover:underline"
            >
              {t("viewProfile")}
            </Link>
            <Link
              href={`/advisor/delegates/${encodeURIComponent(assignment.delegate_user_id)}/documents`}
              className="text-xs font-medium text-brand-accent hover:underline"
            >
              {t("viewDocuments")}
            </Link>
            <Link
              href={`/advisor/delegates/${encodeURIComponent(assignment.delegate_user_id)}/voting`}
              className="text-xs font-medium text-brand-accent hover:underline"
            >
              {t("viewVoting")}
            </Link>
            <Link
              href={`/advisor/delegates/${encodeURIComponent(assignment.delegate_user_id)}/notes`}
              className="text-xs font-medium text-brand-accent hover:underline"
            >
              {t("sendNote")}
            </Link>
          </>
        ) : null}
        <Link href="/advisor/notes" className="text-xs font-medium text-brand-accent hover:underline">
          {t("forwardedNotes")}
        </Link>
      </div>
    </li>
  );
}

export function AdvisorOversightPanel({ assignments }: { assignments: AdvisorAssignmentRow[] }) {
  const t = useTranslations("advisorDashboard");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const tCommitteeTags = useTranslations("committeeTags");

  const sections = useMemo(
    () =>
      groupAdvisorDelegatesByDifficultyAndCommittee(assignments, {
        getCommittee: (a) => a.committee,
        getSortLabel: (a) => a.delegate_name?.trim() || a.delegate_country,
      }),
    [assignments]
  );

  return (
    <div className="space-y-8">
      {sections.map((section, sectionIndex) => (
        <section
          key={section.difficulty ?? "other"}
          className={sectionIndex > 0 ? "border-t border-brand-navy/10 pt-8 dark:border-white/10" : undefined}
          aria-labelledby={`advisor-difficulty-${section.difficulty ?? "other"}`}
        >
          <div className="mb-4 flex items-center gap-3">
            {section.difficulty ? (
              <h2
                id={`advisor-difficulty-${section.difficulty}`}
                className={difficultyTagClass(section.difficulty)}
              >
                {translateCommitteeTagDifficulty(section.difficulty, tCommitteeTags)}
              </h2>
            ) : (
              <h2
                id="advisor-difficulty-other"
                className="inline-flex rounded-full border border-brand-navy/15 bg-brand-navy/[0.04] px-2 py-0.5 text-[0.68rem] font-semibold text-brand-navy/80 dark:border-white/15 dark:bg-white/[0.06] dark:text-brand-muted"
              >
                {t("oversight.difficultyOther")}
              </h2>
            )}
            <div className="h-px min-w-0 flex-1 bg-brand-navy/12 dark:bg-white/12" role="presentation" aria-hidden />
          </div>

          <div className="space-y-6">
            {section.committees.map((group) => (
              <div key={group.committee}>
                <h3 className="mb-3 text-sm font-semibold text-brand-navy dark:text-zinc-100">
                  {translateCommitteeLabel(tCommitteeLabels, group.committee)}
                </h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {group.items.map((assignment) => (
                    <DelegateCard key={assignment.id} assignment={assignment} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
