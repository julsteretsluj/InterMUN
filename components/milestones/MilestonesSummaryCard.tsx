// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MilestonesSummary } from "@/app/api/milestones/summary/route";

/**
 * Compact milestones teaser for role dashboards. Fetches a condensed summary so
 * the host dashboard (a server component) needs no extra queries — just drop it
 * in with the role-appropriate `href` to the full Milestones page.
 */
export function MilestonesSummaryCard({ href = "/milestones" }: { href?: string }) {
  const t = useTranslations("milestones");
  const [summary, setSummary] = useState<MilestonesSummary | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/milestones/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: MilestonesSummary | null) => {
        if (active) setSummary(json);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link href={href} className="dashboard-panel mun-lift block space-y-3 no-underline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="dashboard-panel-title">🏅 {t("cardTitle")}</h3>
        {summary ? (
          <span className="dashboard-status-badge dashboard-status-badge--gold shrink-0">
            {t("earnedOfTotal", { earned: summary.earned, total: summary.total })}
          </span>
        ) : null}
      </div>

      {summary && summary.highlights.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {summary.highlights.map((h) => (
            <span
              key={h.metricId}
              className="inline-flex items-center gap-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)] px-2.5 py-1 text-xs text-brand-muted"
            >
              <span aria-hidden>{h.icon}</span>
              <span className="font-mono font-semibold tabular-nums text-brand-navy">{h.count}</span>
              <span className="hidden sm:inline">{t(`metric.${h.metricId}`)}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-brand-muted">{t("cardEmpty")}</p>
      )}

      <p className="text-xs font-medium text-[var(--accent)]">{t("cardCta")}</p>
    </Link>
  );
}
