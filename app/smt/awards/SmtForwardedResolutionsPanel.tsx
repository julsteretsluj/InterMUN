// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { selectBestResolutionAwardAction } from "@/app/actions/awards";

export type SmtForwardedResolutionRow = {
  id: string;
  conferenceId: string;
  committeeLabel: string;
  blocName: string;
  displayLabel: string;
  googleDocsUrl: string | null;
  clauseCount: number;
  mainSubmitterNames: string[];
  firstMainSubmitterId: string | null;
  forwardedAt: string | null;
  selectedAsCommittee: boolean;
  selectedAsConference: boolean;
};

export function SmtForwardedResolutionsPanel({ rows }: { rows: SmtForwardedResolutionRow[] }) {
  const t = useTranslations("smtAwardsResolutions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  function select(resolutionId: string, category: "committee_best_resolution" | "conference_best_resolution") {
    setErrorById((prev) => ({ ...prev, [resolutionId]: "" }));
    startTransition(async () => {
      const res = await selectBestResolutionAwardAction({ resolutionId, category });
      if (!res.success) {
        setErrorById((prev) => ({ ...prev, [resolutionId]: res.error ?? t("selectFailed") }));
        return;
      }
      router.refresh();
    });
  }

  const sorted = [...rows].sort((a, b) => {
    const byCommittee = a.committeeLabel.localeCompare(b.committeeLabel);
    if (byCommittee !== 0) return byCommittee;
    return a.displayLabel.localeCompare(b.displayLabel);
  });

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-3 text-sm text-brand-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {sorted.map((row) => (
          <li
            key={row.id}
            className="space-y-3 rounded-xl border border-brand-navy/10 bg-brand-paper p-4 text-sm text-brand-navy"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">{row.displayLabel}</p>
                {row.forwardedAt ? (
                  <p className="text-xs text-brand-muted">
                    {t("forwardedAt", { when: new Date(row.forwardedAt).toLocaleString() })}
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-brand-muted">{t("clauseCount", { count: row.clauseCount })}</p>
            </div>
            {row.mainSubmitterNames.length > 0 ? (
              <p className="text-xs text-brand-navy/80">
                {t("mainSubmitters")}: {row.mainSubmitterNames.join(", ")}
              </p>
            ) : null}
            {row.googleDocsUrl ? (
              <a
                href={row.googleDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm font-medium text-brand-diplomatic hover:underline dark:text-brand-accent-bright"
              >
                {t("openDoc")}
              </a>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => select(row.id, "committee_best_resolution")}
                className={
                  row.selectedAsCommittee
                    ? "rounded-lg bg-[#007AFF] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    : "rounded-lg border border-[var(--hairline)] bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-cream disabled:opacity-50"
                }
              >
                {row.selectedAsCommittee ? t("selectedCommittee") : t("selectCommittee")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => select(row.id, "conference_best_resolution")}
                className={
                  row.selectedAsConference
                    ? "rounded-lg bg-[#007AFF] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    : "rounded-lg border border-[var(--hairline)] bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-cream disabled:opacity-50"
                }
              >
                {row.selectedAsConference ? t("selectedConference") : t("selectConference")}
              </button>
            </div>
            {errorById[row.id] ? (
              <p className="text-xs text-red-700 dark:text-red-300">{errorById[row.id]}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
