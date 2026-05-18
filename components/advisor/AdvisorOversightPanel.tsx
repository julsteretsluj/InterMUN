"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AdvisorAssignmentRow } from "@/lib/advisor-access";

export function AdvisorOversightPanel({ assignments }: { assignments: AdvisorAssignmentRow[] }) {
  const t = useTranslations("advisorDashboard");

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {assignments.map((a) => (
        <li
          key={a.id}
          className="rounded-xl border border-brand-navy/10 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
        >
          <h2 className="font-semibold text-brand-navy dark:text-zinc-100">{a.delegate_country}</h2>
          <p className="mt-1 text-xs text-brand-muted">
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
