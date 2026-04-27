"use client";

import { useMemo, useState } from "react";
import {
  maxRubricTotal,
  rubricBandInitials,
  rubricNumericTotal,
  type NominationRubricType,
} from "@/lib/seamuns-award-scoring";
import { PromoteNominationForm } from "./PromoteNominationForm";
import { RejectNominationForm } from "./RejectNominationForm";
import { useTranslations } from "next-intl";

export type ChairNominationRow = {
  id: string;
  nomination_type: NominationRubricType;
  rank: number;
  status: string;
  evidence_note: string | null;
  rubric_scores: Record<string, number> | null;
  committee_conference_id: string;
  nominee_profile_id: string;
};

type CommitteeTab = { id: string; label: string };

type Props = {
  nominations: ChairNominationRow[];
  committeeLabelByConferenceId: Record<string, string>;
  nomineeNameByProfileId: Record<string, string>;
  conferenceIdToCanonical?: Record<string, string>;
  committeeTabs?: CommitteeTab[];
};

export function ChairNominationsPanel({
  nominations,
  committeeLabelByConferenceId,
  nomineeNameByProfileId,
  conferenceIdToCanonical = {},
  committeeTabs = [],
}: Props) {
  const t = useTranslations("chairNominationsPanel");
  const [committeeFilter, setCommitteeFilter] = useState<"all" | string>("all");
  const nominationTypeLabel: Record<NominationRubricType, string> = {
    committee_best_delegate: t("bestDelegateCommittee"),
    committee_honourable_mention: t("honourableMentionCommittee"),
    committee_best_position_paper: t("bestPositionPaperCommittee"),
    conference_best_delegate: t("bestDelegateOverall"),
  };

  const canonical = (rawConferenceId: string) => conferenceIdToCanonical[rawConferenceId] ?? rawConferenceId;

  const countByCommittee = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nominations) {
      const k = canonical(n.committee_conference_id);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [nominations, conferenceIdToCanonical]);

  const visibleNominations = useMemo(() => {
    if (committeeFilter === "all" || committeeTabs.length === 0) return nominations;
    return nominations.filter((n) => canonical(n.committee_conference_id) === committeeFilter);
  }, [nominations, committeeFilter, committeeTabs.length, conferenceIdToCanonical]);

  const tabBtn = (id: "all" | string, label: string, count: number, domId: string) => (
    <button
      key={domId}
      id={domId}
      type="button"
      role="tab"
      aria-selected={committeeFilter === id}
      onClick={() => setCommitteeFilter(id)}
      className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px max-w-[12rem] truncate ${
        committeeFilter === id
          ? "border-brand-accent text-brand-navy bg-brand-paper"
          : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
      }`}
      title={label}
    >
      {label}
      <span className="ml-1 font-mono text-xs text-brand-muted">({count})</span>
    </button>
  );

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
      <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">{t("title")}</h2>
      <p className="text-xs text-brand-muted mb-3">
        {t("description")}
      </p>
      {committeeTabs.length > 0 && nominations.length > 0 ? (
        <div
          className="mb-3 flex flex-wrap gap-1 overflow-x-auto border-b border-brand-navy/10 pb-px"
          role="tablist"
          aria-label={t("filterByCommitteeAria")}
        >
          {tabBtn("all", t("allCommittees"), nominations.length, "tab-smt-nom-all")}
          {committeeTabs.map((c) =>
            tabBtn(
              c.id,
              c.label,
              countByCommittee.get(c.id) ?? 0,
              `tab-smt-nom-${c.id.slice(0, 8)}`
            )
          )}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">{t("committee")}</th>
              <th className="px-3 py-2">{t("rank")}</th>
              <th className="px-3 py-2">{t("awardType")}</th>
              <th className="px-3 py-2">{t("nominee")}</th>
              <th className="px-3 py-2">{t("rubric")}</th>
              <th className="px-3 py-2">{t("evidence")}</th>
              <th className="px-3 py-2">{t("approveReject")}</th>
            </tr>
          </thead>
          <tbody>
            {nominations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-brand-muted space-y-2">
                  <p className="font-medium text-brand-navy/90">{t("noPendingSubmissions")}</p>
                  <p className="text-xs leading-relaxed max-w-xl mx-auto text-brand-navy/75">
                    {t("emptyStateGuidance")}
                  </p>
                </td>
              </tr>
            ) : visibleNominations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-brand-muted">
                  {t("noRowsForCommittee")} <span className="font-medium text-brand-navy">{t("allCommittees")}</span>{" "}
                  {t("orAnotherTab")}
                </td>
              </tr>
            ) : (
              visibleNominations.map((n) => {
                const nomineeLabel =
                  nomineeNameByProfileId[n.nominee_profile_id] ?? n.nominee_profile_id.slice(0, 8);
                return (
                  <tr key={n.id} className="border-t border-brand-navy/5 align-top">
                    <td className="px-3 py-2 text-brand-navy">
                      {committeeLabelByConferenceId[n.committee_conference_id] ??
                        n.committee_conference_id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 text-brand-navy font-medium">{t("topRank", { rank: n.rank })}</td>
                    <td className="px-3 py-2 text-brand-navy/85">{nominationTypeLabel[n.nomination_type]}</td>
                    <td className="px-3 py-2">{nomineeLabel}</td>
                    <td className="px-3 py-2 text-brand-navy/90 text-xs align-top">
                      <span className="font-mono tabular-nums">
                        {rubricNumericTotal(n.rubric_scores, n.nomination_type)}/
                        {maxRubricTotal(n.nomination_type)}
                      </span>
                      <span className="block text-brand-muted mt-0.5" title={t("bandInitialsTitle")}>
                        {rubricBandInitials(n.rubric_scores, n.nomination_type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-brand-muted max-w-md">{n.evidence_note?.trim() || t("dash")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        {n.nomination_type === "committee_best_delegate" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="committee_best_delegate"
                            label={t("approveBestDelegate")}
                            buttonClassName="text-xs px-2 py-1 rounded bg-brand-accent text-white font-medium"
                          />
                        ) : null}
                        {n.nomination_type === "committee_honourable_mention" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="committee_honourable_mention"
                            label={t("approveHonourableMention")}
                            buttonClassName="text-xs px-2 py-1 rounded border border-brand-navy/20 text-brand-navy"
                          />
                        ) : null}
                        {n.nomination_type === "committee_best_position_paper" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="committee_best_position_paper"
                            label={t("approveBestPositionPaper")}
                            buttonClassName="text-xs px-2 py-1 rounded bg-brand-accent text-white font-medium"
                          />
                        ) : null}
                        {n.nomination_type === "conference_best_delegate" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="conference_best_delegate"
                            label={t("approveBestDelegateOverall")}
                            buttonClassName="text-xs px-2 py-1 rounded bg-brand-accent text-white font-medium"
                          />
                        ) : null}
                        <RejectNominationForm nominationId={n.id} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
