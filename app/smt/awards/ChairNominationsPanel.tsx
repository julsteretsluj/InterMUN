"use client";

import {
  maxRubricTotal,
  rubricBandInitials,
  rubricNumericTotal,
  type NominationRubricType,
} from "@/lib/seamuns-award-scoring";
import { PromoteNominationForm } from "./PromoteNominationForm";
import { RejectNominationForm } from "./RejectNominationForm";

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

const nominationTypeLabel: Record<NominationRubricType, string> = {
  committee_best_delegate: "Best Delegate (committee)",
  committee_honourable_mention: "Honourable Mention (committee)",
  committee_best_position_paper: "Best Position Paper (committee)",
  conference_best_delegate: "Best Delegate (overall)",
};

type Props = {
  nominations: ChairNominationRow[];
  committeeLabelByConferenceId: Record<string, string>;
  nomineeNameByProfileId: Record<string, string>;
};

export function ChairNominationsPanel({
  nominations,
  committeeLabelByConferenceId,
  nomineeNameByProfileId,
}: Props) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
      <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">Award submissions by chairs</h2>
      <p className="text-xs text-brand-muted mb-3">
        Committees submit scored nominations (SEAMUNs-style bands). Rubric totals and band initials (B/D/P/E)
        summarize each row. For each committee and award type, SMT reviews the chair&apos;s current preference
        first (Top 1). Approve to record the award, or reject to move to the next backup rank (Top 2, then Top 3
        for Honourable Mention where applicable).
      </p>
      <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">Committee</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Award type</th>
              <th className="px-3 py-2">Nominee</th>
              <th className="px-3 py-2">Rubric</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Approve / reject</th>
            </tr>
          </thead>
          <tbody>
            {nominations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-brand-muted">
                  No pending chair submissions yet.
                </td>
              </tr>
            ) : (
              nominations.map((n) => {
                const nomineeLabel =
                  nomineeNameByProfileId[n.nominee_profile_id] ?? n.nominee_profile_id.slice(0, 8);
                return (
                  <tr key={n.id} className="border-t border-brand-navy/5 align-top">
                    <td className="px-3 py-2 text-brand-navy">
                      {committeeLabelByConferenceId[n.committee_conference_id] ??
                        n.committee_conference_id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 text-brand-navy font-medium">Top {n.rank}</td>
                    <td className="px-3 py-2 text-brand-navy/85">{nominationTypeLabel[n.nomination_type]}</td>
                    <td className="px-3 py-2">{nomineeLabel}</td>
                    <td className="px-3 py-2 text-brand-navy/90 text-xs align-top">
                      <span className="font-mono tabular-nums">
                        {rubricNumericTotal(n.rubric_scores, n.nomination_type)}/
                        {maxRubricTotal(n.nomination_type)}
                      </span>
                      <span className="block text-brand-muted mt-0.5" title="Band initials: B/D/P/E">
                        {rubricBandInitials(n.rubric_scores, n.nomination_type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-brand-muted max-w-md">{n.evidence_note?.trim() || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        {n.nomination_type === "committee_best_delegate" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="committee_best_delegate"
                            label="Approve — Best Delegate"
                            buttonClassName="text-xs px-2 py-1 rounded bg-brand-gold text-white font-medium"
                          />
                        ) : null}
                        {n.nomination_type === "committee_honourable_mention" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="committee_honourable_mention"
                            label="Approve — Honourable Mention"
                            buttonClassName="text-xs px-2 py-1 rounded border border-brand-navy/20 text-brand-navy"
                          />
                        ) : null}
                        {n.nomination_type === "committee_best_position_paper" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="committee_best_position_paper"
                            label="Approve — Best Position Paper"
                            buttonClassName="text-xs px-2 py-1 rounded bg-brand-gold text-white font-medium"
                          />
                        ) : null}
                        {n.nomination_type === "conference_best_delegate" ? (
                          <PromoteNominationForm
                            nominationId={n.id}
                            category="conference_best_delegate"
                            label="Approve — Best Delegate (overall)"
                            buttonClassName="text-xs px-2 py-1 rounded bg-brand-gold text-white font-medium"
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
