"use client";

import { useState } from "react";
import { AwardsManagerClient } from "@/app/(dashboard)/chair/awards/AwardsManagerClient";
import type { AwardAssignment, AwardParticipationScore } from "@/types/database";
import { AwardsRubricReference } from "@/components/awards/AwardsRubricReference";
import { ChairNominationsPanel, type ChairNominationRow } from "./ChairNominationsPanel";
import { SmtParticipationPanel } from "./SmtParticipationPanel";
import { SmtBestDelegateComparison, type BestDelegateComparisonRow } from "./SmtBestDelegateComparison";
import type { ChairSeat, DelegateChairFeedbackAggregate } from "@/lib/award-participation-scoring";

type Conf = { id: string; name: string; committee: string | null };
type Prof = { id: string; name: string | null };

type CommitteeOpt = { id: string; label: string };

type TabId = "final" | "pending" | "scoring" | "rubric";

type ParticipationBundle = {
  committees: CommitteeOpt[];
  chairSeats: ChairSeat[];
  scoreRows: AwardParticipationScore[];
  delegateChairFeedback: DelegateChairFeedbackAggregate[];
  chairRanking: { seat: ChairSeat; total: number }[];
  reportRanking: { committee: CommitteeOpt; total: number }[];
  smtComplete: boolean;
  missingChairs: string[];
  missingReports: string[];
};

type Props = {
  nominations: ChairNominationRow[];
  committeeLabelByConferenceId: Record<string, string>;
  nomineeNameByProfileId: Record<string, string>;
  conferences: Conf[];
  assignments: AwardAssignment[];
  profiles: Prof[];
  participation: ParticipationBundle;
  hasActiveEvent: boolean;
  /** Maps raw `conferences.id` → canonical committee conference id for the active event. */
  conferenceIdToCanonical: Record<string, string>;
  bestDelegateComparisonRows: BestDelegateComparisonRow[];
};

export function SmtAwardsTabs({
  nominations,
  committeeLabelByConferenceId,
  nomineeNameByProfileId,
  conferences,
  assignments,
  profiles,
  participation,
  hasActiveEvent,
  conferenceIdToCanonical,
  bestDelegateComparisonRows,
}: Props) {
  const [tab, setTab] = useState<TabId>("final");

  const tabBtn = (id: TabId, label: string, domId: string) => (
    <button
      id={domId}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        tab === id
          ? "border-brand-accent text-brand-navy bg-brand-paper"
          : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label="SMT awards">
        {tabBtn("final", "Final awards", "tab-smt-final")}
        {tabBtn("pending", "Pending awards", "tab-smt-pending")}
        {tabBtn("scoring", "Scoring", "tab-smt-scoring")}
        {tabBtn("rubric", "Rubric", "tab-smt-rubric")}
      </div>

      {tab === "final" ? (
        <div role="tabpanel" aria-labelledby="tab-smt-final" className="space-y-6">
          <section className="rounded-xl border border-brand-navy/10 bg-logo-cyan/10 p-4 text-sm text-brand-navy">
            <h2 className="font-display text-lg font-semibold text-brand-navy mb-1">Final recorded awards</h2>
            <p className="text-xs text-brand-muted">
              Official recipients entered by SMT. Tick rows to include them in a printable certificate run, then use{" "}
              <span className="font-medium text-brand-navy">Print selected</span>. Add or edit entries below.
            </p>
          </section>
          <AwardsManagerClient
            conferences={conferences}
            assignments={assignments}
            profiles={profiles}
            enableCertificatePrint
          />
        </div>
      ) : tab === "pending" ? (
        <div role="tabpanel" aria-labelledby="tab-smt-pending" className="space-y-4">
          <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/50 p-4 text-sm text-brand-muted">
            <p>
              Chair submissions awaiting review: approve or reject nominations. Approved rows feed the Final awards tab
              when promoted to assignments.
            </p>
          </div>
          <ChairNominationsPanel
            nominations={nominations}
            committeeLabelByConferenceId={committeeLabelByConferenceId}
            nomineeNameByProfileId={nomineeNameByProfileId}
            conferenceIdToCanonical={conferenceIdToCanonical}
            committeeTabs={participation.committees}
          />
        </div>
      ) : tab === "scoring" ? (
        <div role="tabpanel" aria-labelledby="tab-smt-scoring" className="space-y-8">
          {!hasActiveEvent ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-100">
              Select an active event (event gate / conference code) to load committees for mandatory SMT chair and
              chair-report scoring.
            </div>
          ) : null}
          <SmtParticipationPanel
            committees={participation.committees}
            chairSeats={participation.chairSeats}
            scoreRows={participation.scoreRows}
            delegateChairFeedback={participation.delegateChairFeedback}
            chairRanking={participation.chairRanking}
            reportRanking={participation.reportRanking}
            smtComplete={participation.smtComplete}
            missingChairs={participation.missingChairs}
            missingReports={participation.missingReports}
            conferenceIdToCanonical={conferenceIdToCanonical}
          />
          <SmtBestDelegateComparison
            rows={bestDelegateComparisonRows}
            committeeLabelByConferenceId={committeeLabelByConferenceId}
            nomineeNameByProfileId={nomineeNameByProfileId}
          />
        </div>
      ) : (
        <div role="tabpanel" aria-labelledby="tab-smt-rubric">
          <AwardsRubricReference />
        </div>
      )}
    </div>
  );
}
