// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import { PREVIEW_CARD, PREVIEW_LABEL } from "./marketing-preview-styles";

type NominationType =
  | "committee_best_delegate"
  | "committee_honourable_mention"
  | "committee_best_position_paper";

type DemoNomination = {
  id: string;
  committeeId: string;
  committee: string;
  rank: number;
  nominationType: NominationType;
  nominee: string;
  rubricTotal: string;
  rubricBands: string;
  evidence: string;
  evidenceValid: boolean;
};

type RowStatus = "pending" | "approved" | "rejected";

const NOMINATION_SEED: DemoNomination[] = [
  {
    id: "n1",
    committeeId: "ecosoc",
    committee: "ECOSOC",
    rank: 1,
    nominationType: "committee_best_delegate",
    nominee: "Norway — Erik L.",
    rubricTotal: "14/16",
    rubricBands: "P/P/E/E",
    evidence:
      "Led bloc coordination on operative clauses and spoke clearly in moderated caucus without exceeding time.",
    evidenceValid: true,
  },
  {
    id: "n2",
    committeeId: "ecosoc",
    committee: "ECOSOC",
    rank: 1,
    nominationType: "committee_honourable_mention",
    nominee: "Kenya — Amina O.",
    rubricTotal: "12/16",
    rubricBands: "D/P/P/E",
    evidence:
      "Strong research in position paper and constructive amendments; quieter in unmoderated but reliable in roll call.",
    evidenceValid: true,
  },
  {
    id: "n3",
    committeeId: "legal",
    committee: "Legal",
    rank: 1,
    nominationType: "committee_best_position_paper",
    nominee: "Mexico — Luis R.",
    rubricTotal: "13/16",
    rubricBands: "P/D/P/E",
    evidence:
      "Position paper cited treaty language accurately and mapped solutions to committee mandate with clear structure.",
    evidenceValid: true,
  },
];

const COMMITTEE_TABS = [
  { id: "ecosoc", label: "ECOSOC" },
  { id: "legal", label: "Legal" },
];

function approveLabel(type: NominationType, t: (key: string) => string): string {
  switch (type) {
    case "committee_best_delegate":
      return t("approveBestDelegate");
    case "committee_honourable_mention":
      return t("approveHonourableMention");
    case "committee_best_position_paper":
      return t("approveBestPositionPaper");
    default:
      return t("approveBestDelegate");
  }
}

export function MarketingAwardsReviewPanel({ className }: { className?: string }) {
  const t = useTranslations("chairNominationsPanel");
  const tPreview = useTranslations("marketing.rolePreviews.secretariat");
  const [committeeFilter, setCommitteeFilter] = useState<"all" | string>("all");
  const [statusById, setStatusById] = useState<Record<string, RowStatus>>({});

  const nominationTypeLabel: Record<NominationType, string> = {
    committee_best_delegate: t("bestDelegateCommittee"),
    committee_honourable_mention: t("honourableMentionCommittee"),
    committee_best_position_paper: t("bestPositionPaperCommittee"),
  };

  const visibleRows = useMemo(() => {
    if (committeeFilter === "all") return NOMINATION_SEED;
    return NOMINATION_SEED.filter((row) => row.committeeId === committeeFilter);
  }, [committeeFilter]);

  const countByCommittee = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of NOMINATION_SEED) {
      counts.set(row.committeeId, (counts.get(row.committeeId) ?? 0) + 1);
    }
    return counts;
  }, []);

  return (
    <div className={cn(PREVIEW_CARD, "space-y-3", className)}>
      <div>
        <span className={PREVIEW_LABEL}>{tPreview("awardsReviewLabel")}</span>
        <h3 className="mt-2 font-sans text-sm font-semibold text-[var(--clicky-ink)]">{t("title")}</h3>
        <p className="mt-1 text-[0.65rem] leading-relaxed text-[var(--clicky-ink-faint)]">{t("description")}</p>
        <p className="mt-1 text-[0.65rem] text-[var(--clicky-ink-soft)]">{t("evidenceRequiredHint")}</p>
      </div>

      <div
        className="flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--clicky-line)] pb-px"
        role="tablist"
        aria-label={t("filterByCommitteeAria")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={committeeFilter === "all"}
          onClick={() => setCommitteeFilter("all")}
          className={cn(
            "shrink-0 rounded-t-lg border-b-2 px-2.5 py-1.5 text-xs font-medium transition",
            committeeFilter === "all"
              ? "border-[var(--clicky-blue)] bg-white text-[var(--clicky-ink)]"
              : "border-transparent text-[var(--clicky-ink-faint)] hover:text-[var(--clicky-ink)]"
          )}
        >
          {t("allCommittees")}
          <span className="ml-1 font-mono text-[0.65rem] text-[var(--clicky-ink-faint)]">({NOMINATION_SEED.length})</span>
        </button>
        {COMMITTEE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={committeeFilter === tab.id}
            onClick={() => setCommitteeFilter(tab.id)}
            className={cn(
              "shrink-0 rounded-t-lg border-b-2 px-2.5 py-1.5 text-xs font-medium transition",
              committeeFilter === tab.id
                ? "border-[var(--clicky-blue)] bg-white text-[var(--clicky-ink)]"
                : "border-transparent text-[var(--clicky-ink-faint)] hover:text-[var(--clicky-ink)]"
            )}
          >
            {tab.label}
            <span className="ml-1 font-mono text-[0.65rem] text-[var(--clicky-ink-faint)]">
              ({countByCommittee.get(tab.id) ?? 0})
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--clicky-line)] bg-white">
        <table className="w-full min-w-[36rem] text-xs">
          <thead>
            <tr className="bg-[var(--clicky-paper)] text-left text-[0.65rem]  tracking-wider text-[var(--clicky-ink-faint)]">
              <th className="px-2.5 py-2">{t("committee")}</th>
              <th className="px-2.5 py-2">{t("rank")}</th>
              <th className="px-2.5 py-2">{t("awardType")}</th>
              <th className="px-2.5 py-2">{t("nominee")}</th>
              <th className="px-2.5 py-2">{t("rubric")}</th>
              <th className="px-2.5 py-2">{t("evidence")}</th>
              <th className="px-2.5 py-2">{t("approveReject")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const status = statusById[row.id] ?? "pending";
              return (
                <tr key={row.id} className="border-t border-[var(--clicky-line)] align-top">
                  <td className="px-2.5 py-2 text-[var(--clicky-ink)]">{row.committee}</td>
                  <td className="px-2.5 py-2 font-medium text-[var(--clicky-ink)]">{t("topRank", { rank: row.rank })}</td>
                  <td className="px-2.5 py-2 text-[var(--clicky-ink)]">{nominationTypeLabel[row.nominationType]}</td>
                  <td className="px-2.5 py-2 text-[var(--clicky-ink)]">{row.nominee}</td>
                  <td className="px-2.5 py-2 text-[var(--clicky-ink)]">
                    <span className="font-mono tabular-nums">{row.rubricTotal}</span>
                    <span className="mt-0.5 block text-[0.65rem] text-[var(--clicky-ink-faint)]" title={t("bandInitialsTitle")}>
                      {row.rubricBands}
                    </span>
                  </td>
                  <td className="max-w-[12rem] px-2.5 py-2 text-[var(--clicky-ink-soft)]">
                    {row.evidence}
                    {!row.evidenceValid ? (
                      <p className="mt-1 text-[0.6rem] text-[var(--clicky-ink-soft)]">{t("evidenceTooShort")}</p>
                    ) : null}
                  </td>
                  <td className="px-2.5 py-2">
                    {status === "pending" ? (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={!row.evidenceValid}
                          onClick={() => setStatusById((prev) => ({ ...prev, [row.id]: "approved" }))}
                          className={cn(
                            "rounded px-2 py-1 text-[0.65rem] font-medium disabled:opacity-50",
                            row.nominationType === "committee_honourable_mention"
                              ? "border border-[var(--clicky-line)] text-[var(--clicky-ink)]"
                              : "bg-[var(--clicky-blue)] text-white"
                          )}
                        >
                          {approveLabel(row.nominationType, t)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusById((prev) => ({ ...prev, [row.id]: "rejected" }))}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[0.65rem] font-medium text-red-900 hover:bg-red-100"
                        >
                          Reject — show backup
                        </button>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                          status === "approved"
                            ? "bg-[color-mix(in_srgb,var(--clicky-mint)_14%,white)] text-[var(--clicky-ink)]"
                            : "bg-[color-mix(in_srgb,var(--clicky-coral)_14%,white)] text-[var(--clicky-ink)]"
                        )}
                      >
                        {status === "approved" ? tPreview("approved") : tPreview("rejected")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
