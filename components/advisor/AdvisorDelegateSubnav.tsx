"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";
import type { AdvisorAssignmentRow } from "@/lib/advisor-access";
import { cn } from "@/lib/utils";

function linkClass(active: boolean) {
  return cn(
    "rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-semibold transition-apple",
    active
      ? "bg-brand-accent/12 text-brand-navy ring-1 ring-brand-accent/35 dark:text-zinc-100"
      : "text-brand-muted hover:bg-brand-navy/5 hover:text-brand-navy"
  );
}

export function AdvisorDelegateSubnav({
  assignment,
  delegateUserId,
}: {
  assignment: AdvisorAssignmentRow;
  delegateUserId: string;
}) {
  const t = useTranslations("advisorDashboard.delegateNav");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const pathname = usePathname();
  const base = `/advisor/delegates/${delegateUserId}`;
  const flag = flagEmojiForCountryName(assignment.delegate_country);
  const displayName = assignment.delegate_name?.trim() || assignment.delegate_country;

  return (
    <div className="mb-6 space-y-4">
      <Link
        href="/advisor"
        className="inline-flex text-xs font-medium text-brand-accent hover:underline"
      >
        {t("backToDashboard")}
      </Link>
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {flag}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-brand-navy dark:text-zinc-100">{displayName}</h1>
          <p className="text-sm text-brand-muted">{assignment.delegate_country}</p>
          {assignment.committee ? (
            <p className="mt-1 text-xs font-semibold text-brand-navy/80 dark:text-zinc-300">
              {translateCommitteeLabel(tCommitteeLabels, assignment.committee)}
            </p>
          ) : null}
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={t("ariaLabel")}>
        <Link href={base} className={linkClass(pathname === base)}>
          {t("profile")}
        </Link>
        <Link href={`${base}/documents`} className={linkClass(pathname === `${base}/documents`)}>
          {t("documents")}
        </Link>
        <Link href={`${base}/voting`} className={linkClass(pathname === `${base}/voting`)}>
          {t("voting")}
        </Link>
        <Link href="/advisor/notes" className={linkClass(pathname.startsWith("/advisor/notes"))}>
          {t("notes")}
        </Link>
      </nav>
    </div>
  );
}
