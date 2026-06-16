"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AdvisorAssignmentRow } from "@/lib/advisor-access";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";

const committeeTagClass =
  "inline-flex rounded-full border border-brand-accent/35 bg-brand-accent/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-brand-navy dark:border-brand-accent/40 dark:bg-brand-accent/15 dark:text-zinc-100";

export function AdvisorOversightPanel({ assignments }: { assignments: AdvisorAssignmentRow[] }) {
  const t = useTranslations("advisorDashboard");
  const tCommitteeLabels = useTranslations("committeeNames.labels");

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {assignments.map((a) => (
        <li
          key={a.id}
          className="rounded-xl border border-brand-navy/10 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-semibold text-brand-navy dark:text-zinc-100">{a.delegate_country}</h2>
              {a.delegate_name ? (
                <p className="mt-0.5 text-sm text-brand-navy/90 dark:text-zinc-200">{a.delegate_name}</p>
              ) : null}
            </div>
            {a.committee ? (
              <span className={committeeTagClass}>
                {translateCommitteeLabel(tCommitteeLabels, a.committee)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-brand-muted">
            {a.delegate_user_id ? t("delegateLinked") : t("delegateNotLinked")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {a.delegate_user_id ? (
              <>
                <Link
                  href={`/profile?for=${encodeURIComponent(a.delegate_user_id)}`}
                  className="text-xs font-medium text-brand-accent hover:underline"
                >
                  {t("viewProfile")}
                </Link>
                <Link
                  href="/documents"
                  className="text-xs font-medium text-brand-accent hover:underline"
                >
                  {t("viewDocuments")}
                </Link>
                <Link
                  href="/voting"
                  className="text-xs font-medium text-brand-accent hover:underline"
                >
                  {t("viewVoting")}
                </Link>
              </>
            ) : null}
            <Link
              href="/advisor/notes"
              className="text-xs font-medium text-brand-accent hover:underline"
            >
              {t("forwardedNotes")}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
