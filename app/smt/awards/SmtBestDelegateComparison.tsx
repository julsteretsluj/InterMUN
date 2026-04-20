"use client";

import { useMemo } from "react";
import {
  maxRubricTotal,
  rubricBandInitials,
  rubricNumericTotal,
  type NominationRubricType,
} from "@/lib/seamuns-award-scoring";

export type BestDelegateComparisonRow = {
  id: string;
  nomination_type: NominationRubricType;
  rank: number;
  status: string;
  evidence_note: string | null;
  rubric_scores: Record<string, number> | null;
  committee_conference_id: string;
  nominee_profile_id: string;
};

type Props = {
  rows: BestDelegateComparisonRow[];
  committeeLabelByConferenceId: Record<string, string>;
  nomineeNameByProfileId: Record<string, string>;
};

const BD_TYPES = new Set<NominationRubricType>(["committee_best_delegate", "conference_best_delegate"]);

export function SmtBestDelegateComparison({
  rows,
  committeeLabelByConferenceId,
  nomineeNameByProfileId,
}: Props) {
  const filtered = useMemo(() => rows.filter((r) => BD_TYPES.has(r.nomination_type)), [rows]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const tb = rubricNumericTotal(b.rubric_scores, b.nomination_type);
      const ta = rubricNumericTotal(a.rubric_scores, a.nomination_type);
      if (tb !== ta) return tb - ta;
      const nb = nomineeNameByProfileId[b.nominee_profile_id] ?? b.nominee_profile_id;
      const na = nomineeNameByProfileId[a.nominee_profile_id] ?? a.nominee_profile_id;
      return na.localeCompare(nb);
    });
  }, [filtered, nomineeNameByProfileId]);

  if (sorted.length === 0) {
    return (
      <section className="rounded-xl border border-brand-navy/10 bg-brand-paper/60 p-4 md:p-5">
        <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100 mb-1">
          Best Delegate submissions (comparison)
        </h3>
        <p className="text-xs text-brand-muted">
          No committee or overall Best Delegate nominations in draft or pending for this event yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5 space-y-3">
      <div>
        <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">
          Best Delegate submissions (comparison)
        </h3>
        <p className="text-xs text-brand-muted mt-1">
          All committee-level and overall Best Delegate chair submissions for this event, sorted by rubric total (highest
          first). Compare scores and evidence side by side before approvals.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-brand-navy/10 bg-brand-cream/80 text-xs uppercase tracking-wide text-brand-muted">
              <th className="px-3 py-2">Nominee</th>
              <th className="px-3 py-2">Award</th>
              <th className="px-3 py-2">Committee</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Rubric</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((n) => {
              const nominee =
                nomineeNameByProfileId[n.nominee_profile_id] ?? n.nominee_profile_id.slice(0, 8);
              const committee =
                committeeLabelByConferenceId[n.committee_conference_id] ??
                n.committee_conference_id.slice(0, 8);
              const awardLabel =
                n.nomination_type === "conference_best_delegate"
                  ? "Best Delegate (overall)"
                  : "Best Delegate (committee)";
              const total = rubricNumericTotal(n.rubric_scores, n.nomination_type);
              const max = maxRubricTotal(n.nomination_type);
              return (
                <tr key={n.id} className="border-b border-brand-navy/5 align-top">
                  <td className="px-3 py-2 font-medium text-brand-navy dark:text-zinc-100">{nominee}</td>
                  <td className="px-3 py-2 text-brand-navy/90">{awardLabel}</td>
                  <td className="px-3 py-2 text-brand-muted">{committee}</td>
                  <td className="px-3 py-2 tabular-nums">Top {n.rank}</td>
                  <td className="px-3 py-2 capitalize text-brand-muted">{n.status}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">
                    <span>
                      {total}/{max}
                    </span>
                    <span className="block text-brand-muted mt-0.5" title="Band initials">
                      {rubricBandInitials(n.rubric_scores, n.nomination_type)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-brand-muted max-w-md">{n.evidence_note?.trim() || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
