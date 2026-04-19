"use client";

import { useState } from "react";
import { AwardsManagerClient } from "@/app/(dashboard)/chair/awards/AwardsManagerClient";
import type { AwardAssignment, AwardParticipationScore } from "@/types/database";
import { ChairNominationsPanel, type ChairNominationRow } from "./ChairNominationsPanel";
import { SmtAwardsRubricPanel } from "./SmtAwardsRubricPanel";
import { SmtParticipationPanel } from "./SmtParticipationPanel";
import type { ChairSeat, DelegateChairFeedbackAggregate } from "@/lib/award-participation-scoring";

type Conf = { id: string; name: string; committee: string | null };
type Prof = { id: string; name: string | null };

type CommitteeOpt = { id: string; label: string };

type TabId = "scoring" | "awards";

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
}: Props) {
  const [tab, setTab] = useState<TabId>("scoring");

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
        {tabBtn("scoring", "Scoring", "tab-smt-scoring")}
        {tabBtn("awards", "Awards", "tab-smt-awards")}
      </div>

      {tab === "scoring" ? (
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
          />

          <section className="space-y-6">
            <section className="rounded-xl border border-brand-navy/10 bg-logo-cyan/10 p-4 text-sm text-brand-navy">
              <h2 className="font-display text-lg font-semibold text-brand-navy mb-1">
                Award submissions for chair & committee awards
              </h2>
              <p className="text-xs text-brand-muted">
                Record final recipients for overall trophies, chair honours, and committee-level awards. Overall: Best
                Delegate (Trophy), Best Position Paper. Chair: Best Chair, Honourable Mention Chair, Best Committee, Best
                Chair Report. Committee: Best Delegate, Honourable Mention (1 required; 2 if more than 22 delegates), Best
                Position Paper.
              </p>
            </section>
            <AwardsManagerClient conferences={conferences} assignments={assignments} profiles={profiles} />
          </section>

          <SmtAwardsRubricPanel />
        </div>
      ) : (
        <div role="tabpanel" aria-labelledby="tab-smt-awards" className="space-y-4">
          <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/50 p-4 text-sm text-brand-muted">
            <p>
              Pending award submissions from chairs: review delegate award nominations (committee scope and overall).
              Approvals feed final assignments alongside the Scoring tab.
            </p>
          </div>
          <ChairNominationsPanel
            nominations={nominations}
            committeeLabelByConferenceId={committeeLabelByConferenceId}
            nomineeNameByProfileId={nomineeNameByProfileId}
          />
        </div>
      )}
    </div>
  );
}
