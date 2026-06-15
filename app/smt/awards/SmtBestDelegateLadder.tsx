"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  maxRubricTotal,
  rubricBandInitials,
  rubricNumericTotal,
} from "@/lib/seamuns-award-scoring";
import { hasValidAwardEvidence } from "@/lib/award-evidence";
import {
  buildLadderMatchups,
  ladderChampion,
  pendingOverallBestDelegates,
  type OverallBestDelegateLadderRow,
} from "@/lib/award-best-delegate-ladder";
import { advanceOverallBestDelegateLadderAction } from "@/app/actions/awards";
import { PromoteNominationForm } from "./PromoteNominationForm";
import { RejectNominationForm } from "./RejectNominationForm";

type Props = {
  rows: OverallBestDelegateLadderRow[];
  committeeLabelByConferenceId: Record<string, string>;
  nomineeNameByProfileId: Record<string, string>;
};

function NomineeCard({
  row,
  committeeLabel,
  nomineeName,
  highlight,
}: {
  row: OverallBestDelegateLadderRow;
  committeeLabel: string;
  nomineeName: string;
  highlight?: boolean;
}) {
  const total = rubricNumericTotal(row.rubric_scores, row.nomination_type);
  const max = maxRubricTotal(row.nomination_type);
  const evidenceOk = hasValidAwardEvidence(row.evidence_note);

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        highlight
          ? "border-brand-accent/45 bg-brand-accent/8"
          : "border-brand-navy/10 bg-white/80 dark:bg-discord-elevated"
      }`}
    >
      <p className="font-semibold text-brand-navy dark:text-zinc-100">{nomineeName}</p>
      <p className="text-xs text-brand-muted">{committeeLabel}</p>
      <p className="font-mono text-xs tabular-nums text-brand-navy/90">
        {total}/{max}{" "}
        <span className="text-brand-muted">({rubricBandInitials(row.rubric_scores, row.nomination_type)})</span>
      </p>
      <p className="text-xs text-brand-muted whitespace-pre-wrap border-t border-brand-navy/5 pt-2">
        {row.evidence_note?.trim() || "—"}
      </p>
      {!evidenceOk ? (
        <p className="text-[10px] text-amber-800 dark:text-amber-200">Evidence too short — chair must update before review.</p>
      ) : null}
    </div>
  );
}

export function SmtBestDelegateLadder({
  rows,
  committeeLabelByConferenceId,
  nomineeNameByProfileId,
}: Props) {
  const router = useRouter();
  const pending = useMemo(() => pendingOverallBestDelegates(rows), [rows]);
  const matchups = useMemo(() => buildLadderMatchups(pending), [pending]);
  const champion = useMemo(() => ladderChampion(pending), [pending]);

  if (pending.length === 0) {
    return (
      <section className="rounded-xl border border-brand-navy/10 bg-brand-paper/60 p-4 md:p-5">
        <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100 mb-1">
          Best Delegate (overall) — ladder
        </h3>
        <p className="text-xs text-brand-muted">
          No pending overall Best Delegate nominations. When chairs submit, matchups appear here for head-to-head review.
        </p>
      </section>
    );
  }

  if (champion) {
    const name = nomineeNameByProfileId[champion.nominee_profile_id] ?? champion.nominee_profile_id.slice(0, 8);
    const committee =
      committeeLabelByConferenceId[champion.committee_conference_id] ??
      champion.committee_conference_id.slice(0, 8);
    const canApprove = hasValidAwardEvidence(champion.evidence_note);

    return (
      <section className="rounded-xl border border-brand-accent/35 bg-brand-accent/8 p-4 md:p-5 space-y-3">
        <div>
          <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">
            Best Delegate (overall) — ladder complete
          </h3>
          <p className="text-xs text-brand-muted mt-1">
            One nominee remains after ladder rounds. Approve to record the conference Best Delegate trophy, or reject to
            reopen the field.
          </p>
        </div>
        <NomineeCard row={champion} committeeLabel={committee} nomineeName={name} highlight />
        <div className="flex flex-wrap gap-2">
          {canApprove ? (
            <PromoteNominationForm
              nominationId={champion.id}
              category="conference_best_delegate"
              label="Approve — Best Delegate (overall)"
              buttonClassName="text-xs px-3 py-1.5 rounded bg-brand-accent text-white font-medium"
              hasValidEvidence
            />
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Cannot approve until the chair evidence statement meets the minimum length.
            </p>
          )}
          <RejectNominationForm nominationId={champion.id} />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5 space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">
          Best Delegate (overall) — ladder
        </h3>
        <p className="text-xs text-brand-muted mt-1">
          {pending.length} pending nominee{pending.length === 1 ? "" : "s"}. Compare evidence side by side; advance the
          stronger delegate in each matchup (the other is rejected). Repeat until one champion remains, then approve.
        </p>
      </div>

      <div className="space-y-4">
        {matchups.map((m, idx) => {
          const nameA = nomineeNameByProfileId[m.nomineeA.nominee_profile_id] ?? m.nomineeA.nominee_profile_id.slice(0, 8);
          const committeeA =
            committeeLabelByConferenceId[m.nomineeA.committee_conference_id] ??
            m.nomineeA.committee_conference_id.slice(0, 8);
          const canAdvance =
            m.nomineeB &&
            hasValidAwardEvidence(m.nomineeA.evidence_note) &&
            hasValidAwardEvidence(m.nomineeB.evidence_note);

          return (
            <div
              key={`${m.nomineeA.id}-${m.nomineeB?.id ?? "bye"}-${idx}`}
              className="rounded-lg border border-brand-navy/10 p-3 space-y-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{m.roundLabel}</p>
              {m.nomineeB ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <NomineeCard row={m.nomineeA} committeeLabel={committeeA} nomineeName={nameA} />
                    <NomineeCard
                      row={m.nomineeB}
                      committeeLabel={
                        committeeLabelByConferenceId[m.nomineeB.committee_conference_id] ??
                        m.nomineeB.committee_conference_id.slice(0, 8)
                      }
                      nomineeName={
                        nomineeNameByProfileId[m.nomineeB.nominee_profile_id] ??
                        m.nomineeB.nominee_profile_id.slice(0, 8)
                      }
                    />
                  </div>
                  {canAdvance ? (
                    <div className="flex flex-wrap gap-2">
                      <form
                        className="inline"
                        action={async (fd) => {
                          const res = await advanceOverallBestDelegateLadderAction(fd);
                          if (!res.success) {
                            alert(res.error ?? "Could not advance ladder.");
                            return;
                          }
                          await router.refresh();
                        }}
                      >
                        <input type="hidden" name="winner_nomination_id" value={m.nomineeA.id} />
                        <input type="hidden" name="loser_nomination_id" value={m.nomineeB.id} />
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded bg-brand-accent text-white font-medium"
                        >
                          Advance {nameA}
                        </button>
                      </form>
                      <form
                        className="inline"
                        action={async (fd) => {
                          const res = await advanceOverallBestDelegateLadderAction(fd);
                          if (!res.success) {
                            alert(res.error ?? "Could not advance ladder.");
                            return;
                          }
                          await router.refresh();
                        }}
                      >
                        <input type="hidden" name="winner_nomination_id" value={m.nomineeB.id} />
                        <input type="hidden" name="loser_nomination_id" value={m.nomineeA.id} />
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded border border-brand-navy/20 text-brand-navy font-medium"
                        >
                          Advance{" "}
                          {nomineeNameByProfileId[m.nomineeB.nominee_profile_id] ??
                            m.nomineeB.nominee_profile_id.slice(0, 8)}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Both nominees need valid evidence statements before this matchup can be decided.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <NomineeCard row={m.nomineeA} committeeLabel={committeeA} nomineeName={nameA} highlight />
                  <p className="text-xs text-brand-muted">
                    Top seed has a bye this round — no elimination. Continue other matchups; this nominee stays in the
                    pool.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
