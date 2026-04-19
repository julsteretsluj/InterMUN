"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import { saveAwardParticipationScore } from "@/app/actions/award-participation";
import {
  rubricKeysForParticipationScope,
  maxPointsForParticipationScope,
  isRubricScoresComplete,
  rubricNumericTotalForKeys,
  type ChairSeat,
} from "@/lib/award-participation-scoring";
import { DELEGATE_CHAIR_EVIDENCE_MIN_LEN } from "@/lib/delegate-chair-feedback-suggestions";
import { CHAIR_PERFORMANCE_RUBRIC } from "@/lib/seamun-awards-rubric-guide";
import type { AwardParticipationScore } from "@/types/database";
import { cn } from "@/lib/utils";

function scoreMapForChair(
  rows: AwardParticipationScore[],
  committeeId: string,
  chairId: string
): Record<string, number> {
  const row = rows.find(
    (r) =>
      r.scope === "chair_by_delegate" &&
      r.committee_conference_id === committeeId &&
      r.subject_profile_id === chairId
  );
  return (row?.rubric_scores ?? {}) as Record<string, number>;
}

function evidenceForChair(
  rows: AwardParticipationScore[],
  committeeId: string,
  chairId: string
): string {
  const row = rows.find(
    (r) =>
      r.scope === "chair_by_delegate" &&
      r.committee_conference_id === committeeId &&
      r.subject_profile_id === chairId
  );
  return row?.evidence_statement?.trim() ?? "";
}

function seatPk(seat: ChairSeat) {
  return `${seat.committee_conference_id}:${seat.chair_profile_id}`;
}

function buildEvidenceMapFromRows(seats: ChairSeat[], rows: AwardParticipationScore[]) {
  const o: Record<string, string> = {};
  for (const s of seats) {
    o[seatPk(s)] = evidenceForChair(rows, s.committee_conference_id, s.chair_profile_id);
  }
  return o;
}

export function DelegateChairFeedbackPanel({
  chairSeats,
  myScores,
  evidenceSuggestions,
}: {
  chairSeats: ChairSeat[];
  myScores: AwardParticipationScore[];
  evidenceSuggestions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [evidenceByPk, setEvidenceByPk] = useState<Record<string, string>>(() =>
    buildEvidenceMapFromRows(chairSeats, myScores)
  );

  const keys = useMemo(() => rubricKeysForParticipationScope("chair_by_delegate"), []);
  const maxPts = maxPointsForParticipationScope("chair_by_delegate");

  useEffect(() => {
    setEvidenceByPk(buildEvidenceMapFromRows(chairSeats, myScores));
  }, [chairSeats, myScores]);

  function submitForm(fd: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveAwardParticipationScore(fd);
      if (res.error) setMsg(res.error);
      else {
        setMsg("Saved.");
        router.refresh();
      }
    });
  }

  if (chairSeats.length === 0) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        No chair seats found for your active committee. Confirm your committee code / allocation.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-navy/12 bg-logo-cyan/10 p-4 md:p-5 space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">Chair feedback</h2>
        <p className="text-xs text-brand-muted leading-relaxed">
          Rate each chair using the official chair performance rubric (same criteria as secretariat oversight). For each
          chair, add a brief <strong className="text-brand-navy dark:text-zinc-200">evidence statement</strong> ({DELEGATE_CHAIR_EVIDENCE_MIN_LEN}+ characters) citing what you observed in session. Responses are aggregated for SMT; dais members do not see individual scores or statements.
        </p>
        {msg ? <p className="text-xs text-brand-navy dark:text-zinc-200">{msg}</p> : null}
      </section>

      <section className="space-y-4">
        {chairSeats.map((seat) => {
          const pk = seatPk(seat);
          const scoreMap = scoreMapForChair(myScores, seat.committee_conference_id, seat.chair_profile_id);
          const evText = evidenceByPk[pk] ?? "";
          const evidenceOk = evText.trim().length >= DELEGATE_CHAIR_EVIDENCE_MIN_LEN;
          const complete = isRubricScoresComplete(scoreMap, keys) && evidenceOk;
          const total = rubricNumericTotalForKeys(scoreMap, keys);
          return (
            <details key={pk} className="rounded-xl border border-brand-navy/10 bg-brand-paper open:border-brand-accent/30">
              <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-brand-navy dark:text-zinc-100">
                  {seat.committeeLabel} — {seat.chairName}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
                    complete ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200" : "bg-amber-500/15"
                  )}
                >
                  {total}/{maxPts}
                </span>
              </summary>
              <div className="border-t border-brand-navy/10 px-4 pb-4 pt-3 dark:border-white/10">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("scope", "chair_by_delegate");
                    fd.set("committee_conference_id", seat.committee_conference_id);
                    fd.set("subject_profile_id", seat.chair_profile_id);
                    submitForm(fd);
                  }}
                >
                  <input type="hidden" name="scope" value="chair_by_delegate" />
                  <input type="hidden" name="committee_conference_id" value={seat.committee_conference_id} />
                  <input type="hidden" name="subject_profile_id" value={seat.chair_profile_id} />
                  <div className="grid gap-3">
                    {CHAIR_PERFORMANCE_RUBRIC.map((criterion) => (
                      <RubricCriterionPicker
                        key={`${pk}-${criterion.key}`}
                        criterion={criterion}
                        initialScore={Number(scoreMap[criterion.key] ?? 0)}
                        onScoreChange={() => {}}
                        disabled={pending}
                      />
                    ))}
                  </div>
                  {evidenceSuggestions.length > 0 ? (
                    <div className="rounded-lg border border-brand-navy/10 bg-brand-cream/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
                        Suggestions from your saved actions
                      </p>
                      <p className="text-[11px] text-brand-muted mt-0.5">
                        Prior feedback, chair delegate points, and motions you raised—tap to add to this statement.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {evidenceSuggestions.map((snippet, si) => (
                          <button
                            key={`${pk}-s-${si}`}
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setEvidenceByPk((prev) => {
                                const cur = prev[pk] ?? "";
                                const add = cur.trim() ? `${cur.trim()}\n\n${snippet}` : snippet;
                                return { ...prev, [pk]: add };
                              });
                            }}
                            className="max-w-full rounded-lg border border-brand-navy/15 bg-white px-2 py-1 text-left text-[11px] text-brand-navy shadow-sm hover:border-brand-accent/50 dark:border-white/15 dark:bg-zinc-900/80 dark:text-zinc-100"
                          >
                            {snippet.length > 100 ? `${snippet.slice(0, 97)}…` : snippet}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <label className="block space-y-1">
                    <span className="text-brand-muted text-xs uppercase">Evidence statement (required)</span>
                    <textarea
                      name="evidence_statement"
                      value={evText}
                      onChange={(e) => setEvidenceByPk((prev) => ({ ...prev, [pk]: e.target.value }))}
                      required
                      minLength={DELEGATE_CHAIR_EVIDENCE_MIN_LEN}
                      rows={4}
                      disabled={pending}
                      placeholder={`Concrete examples from committee (RoP, caucus, feedback to delegates). Min. ${DELEGATE_CHAIR_EVIDENCE_MIN_LEN} characters.`}
                      className="mt-1 w-full rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy shadow-inner placeholder:text-brand-muted/70 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/25 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                    <span className="text-[11px] text-brand-muted tabular-nums">
                      {evText.trim().length}/{DELEGATE_CHAIR_EVIDENCE_MIN_LEN} characters minimum
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={pending || !complete}
                    className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Save feedback"}
                  </button>
                </form>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
