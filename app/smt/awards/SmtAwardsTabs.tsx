"use client";

import { useState } from "react";
import { AwardsManagerClient } from "@/app/(dashboard)/chair/awards/AwardsManagerClient";
import type { AwardAssignment } from "@/types/database";
import { ChairNominationsPanel, type ChairNominationRow } from "./ChairNominationsPanel";

type Conf = { id: string; name: string; committee: string | null };
type Prof = { id: string; name: string | null };

type TabId = "chair-submissions" | "chair-committee-awards";

type Props = {
  nominations: ChairNominationRow[];
  committeeLabelByConferenceId: Record<string, string>;
  nomineeNameByProfileId: Record<string, string>;
  conferences: Conf[];
  assignments: AwardAssignment[];
  profiles: Prof[];
};

export function SmtAwardsTabs({
  nominations,
  committeeLabelByConferenceId,
  nomineeNameByProfileId,
  conferences,
  assignments,
  profiles,
}: Props) {
  const [tab, setTab] = useState<TabId>("chair-submissions");

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
      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label="Awards sections">
        {tabBtn("chair-submissions", "Award submissions by chairs", "tab-chair-submissions")}
        {tabBtn("chair-committee-awards", "Chair & committee awards", "tab-chair-committee-awards")}
      </div>

      {tab === "chair-submissions" ? (
        <div role="tabpanel" aria-labelledby="tab-chair-submissions">
          <ChairNominationsPanel
            nominations={nominations}
            committeeLabelByConferenceId={committeeLabelByConferenceId}
            nomineeNameByProfileId={nomineeNameByProfileId}
          />
        </div>
      ) : (
        <div role="tabpanel" aria-labelledby="tab-chair-committee-awards" className="space-y-6">
          <section className="rounded-xl border border-brand-navy/10 bg-sky-50/60 p-4 text-sm text-brand-navy">
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
        </div>
      )}
    </div>
  );
}
