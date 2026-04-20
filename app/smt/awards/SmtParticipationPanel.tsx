"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import { saveAwardParticipationScore } from "@/app/actions/award-participation";
import { rubricCriteriaForAwardAssignmentCategory } from "@/lib/award-category-rubric";
import {
  rubricNumericTotalForKeys,
  rubricKeysForParticipationScope,
  maxPointsForParticipationScope,
  isRubricScoresComplete,
} from "@/lib/award-participation-scoring";
import type { RubricCriterion } from "@/lib/seamuns-award-scoring";
import { CHAIR_PERFORMANCE_RUBRIC } from "@/lib/seamun-awards-rubric-guide";
import type { AwardParticipationScore } from "@/types/database";
import type { DelegateChairFeedbackAggregate } from "@/lib/award-participation-scoring";
import { cn } from "@/lib/utils";

type ChairSeat = {
  committee_conference_id: string;
  chair_profile_id: string;
  committeeLabel: string;
  chairName: string;
};

type CommitteeOpt = {
  id: string;
  label: string;
};

type Props = {
  committees: CommitteeOpt[];
  chairSeats: ChairSeat[];
  scoreRows: AwardParticipationScore[];
  delegateChairFeedback: DelegateChairFeedbackAggregate[];
  chairRanking: { seat: ChairSeat; total: number }[];
  reportRanking: { committee: CommitteeOpt; total: number }[];
  smtComplete: boolean;
  missingChairs: string[];
  missingReports: string[];
  conferenceIdToCanonical: Record<string, string>;
};

function ChairReportEvalDetails({
  committee,
  scoreMap,
  reportKeys,
  reportCriteria,
  pending,
  submitForm,
}: {
  committee: CommitteeOpt;
  scoreMap: Record<string, number>;
  reportKeys: string[];
  reportCriteria: RubricCriterion[];
  pending: boolean;
  submitForm: (fd: FormData) => void;
}) {
  const complete = isRubricScoresComplete(scoreMap, reportKeys);
  const total = rubricNumericTotalForKeys(scoreMap, reportKeys);
  const maxPts = maxPointsForParticipationScope("chair_report_by_smt");
  return (
    <details
      key={committee.id}
      open
      className="rounded-xl border border-brand-navy/10 bg-brand-paper open:border-brand-accent/30"
    >
      <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-brand-navy dark:text-zinc-100">{committee.label}</span>
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
            fd.set("scope", "chair_report_by_smt");
            fd.set("committee_conference_id", committee.id);
            submitForm(fd);
          }}
        >
          <input type="hidden" name="scope" value="chair_report_by_smt" />
          <input type="hidden" name="committee_conference_id" value={committee.id} />
          <div className="grid gap-3">
            {reportCriteria.map((criterion) => (
              <RubricCriterionPicker
                key={`${committee.id}-${criterion.key}`}
                criterion={criterion}
                initialScore={Number(scoreMap[criterion.key] ?? 0)}
                onScoreChange={() => {}}
                disabled={pending}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save chair report evaluation"}
          </button>
        </form>
      </div>
    </details>
  );
}

export function SmtParticipationPanel({
  committees,
  chairSeats,
  scoreRows,
  delegateChairFeedback,
  chairRanking,
  reportRanking,
  smtComplete,
  missingChairs,
  missingReports,
  conferenceIdToCanonical,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [committeeScope, setCommitteeScope] = useState<"overview" | string>("overview");

  const canon = useCallback(
    (rawConferenceId: string) => conferenceIdToCanonical[rawConferenceId] ?? rawConferenceId,
    [conferenceIdToCanonical]
  );

  useEffect(() => {
    if (committeeScope === "overview") return;
    if (!committees.some((c) => c.id === committeeScope)) {
      setCommitteeScope("overview");
    }
  }, [committees, committeeScope]);

  const seatsInCommittee = useMemo(() => {
    if (committeeScope === "overview") return [];
    return chairSeats.filter((s) => canon(s.committee_conference_id) === committeeScope);
  }, [chairSeats, committeeScope, canon]);

  const activeCommittee = useMemo(
    () => (committeeScope === "overview" ? null : committees.find((c) => c.id === committeeScope) ?? null),
    [committees, committeeScope]
  );

  const chairKeys = useMemo(() => rubricKeysForParticipationScope("chair_by_smt"), []);
  const reportKeys = useMemo(() => rubricKeysForParticipationScope("chair_report_by_smt"), []);
  const maxDelegatePts = useMemo(() => maxPointsForParticipationScope("chair_by_delegate"), []);
  const reportCriteria = useMemo(
    () => rubricCriteriaForAwardAssignmentCategory("best_chair_report") ?? [],
    []
  );

  function chairScoreMap(committeeId: string, chairId: string): Record<string, number> {
    const row = scoreRows.find(
      (r) =>
        r.scope === "chair_by_smt" &&
        r.committee_conference_id === committeeId &&
        r.subject_profile_id === chairId
    );
    return (row?.rubric_scores ?? {}) as Record<string, number>;
  }

  function reportScoreMap(committeeId: string): Record<string, number> {
    const row = scoreRows.find(
      (r) =>
        r.scope === "chair_report_by_smt" &&
        r.committee_conference_id === committeeId &&
        !r.subject_profile_id
    );
    return (row?.rubric_scores ?? {}) as Record<string, number>;
  }

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

  if (committees.length === 0) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        Select an active event (event gate) to load committees for SMT chair and chair-report scoring.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-navy/12 bg-logo-cyan/10 p-4 md:p-5 space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
          Score every chair &amp; every chair report
        </h2>
        <p className="text-xs text-brand-muted leading-relaxed">
          Delegates submit chair feedback on the same performance rubric (committee-only; aggregated here). Secretariat
          scores chairs and scores each committee&apos;s chair report separately—chair reports are not delegated.
        </p>
        {!smtComplete ? (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/35 dark:text-amber-100 space-y-1">
            <p className="font-semibold">Incomplete</p>
            {missingChairs.length > 0 ? (
              <p>
                Chairs: {missingChairs.slice(0, 8).join("; ")}
                {missingChairs.length > 8 ? "…" : ""}
              </p>
            ) : null}
            {missingReports.length > 0 ? (
              <p>
                Chair reports: {missingReports.slice(0, 8).join("; ")}
                {missingReports.length > 8 ? "…" : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200/90">
            All chair and chair-report evaluations saved for this event.
          </p>
        )}
        {msg ? <p className="text-xs text-brand-navy dark:text-zinc-200">{msg}</p> : null}
      </section>

      <div
        className="flex flex-wrap gap-1 border-b border-brand-navy/10 overflow-x-auto pb-px"
        role="tablist"
        aria-label="Committee scoring"
      >
        <button
          type="button"
          role="tab"
          aria-selected={committeeScope === "overview"}
          onClick={() => setCommitteeScope("overview")}
          className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            committeeScope === "overview"
              ? "border-brand-accent text-brand-navy bg-brand-paper"
              : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
          }`}
        >
          Overview
        </button>
        {committees.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={committeeScope === c.id}
            onClick={() => setCommitteeScope(c.id)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px max-w-[14rem] truncate ${
              committeeScope === c.id
                ? "border-brand-accent text-brand-navy bg-brand-paper"
                : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
            }`}
            title={c.label}
          >
            {c.label}
          </button>
        ))}
      </div>

      {committeeScope === "overview" ? (
        <>
          <p className="text-xs text-brand-muted px-1">
            Cross-committee rankings. Open a committee tab to enter delegate feedback summaries, chair performance scores,
            and the chair report for that committee only.
          </p>
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4">
              <h4 className="font-display text-sm font-semibold text-brand-navy mb-2">Chair ranking (highest → lowest)</h4>
              <p className="text-[10px] uppercase tracking-wide text-brand-muted mb-2">Secretariat</p>
              <ol className="space-y-1.5 text-sm">
                {chairRanking.map((row, i) => (
                  <li
                    key={`${row.seat.committee_conference_id}-${row.seat.chair_profile_id}`}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-brand-muted tabular-nums w-5">{i + 1}.</span>
                    <span className="flex-1 min-w-0">
                      {row.seat.committeeLabel} — {row.seat.chairName}
                    </span>
                    <span className="font-mono font-semibold text-brand-accent tabular-nums">{row.total}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4">
              <h4 className="font-display text-sm font-semibold text-brand-navy mb-2">Delegate feedback (mean → low)</h4>
              <p className="text-[10px] uppercase tracking-wide text-brand-muted mb-2">Aggregated</p>
              <ol className="space-y-1.5 text-sm">
                {[...delegateChairFeedback]
                  .filter((a) => a.responseCount > 0)
                  .sort((a, b) => b.avgTotal - a.avgTotal)
                  .map((a, i) => {
                    const seat = chairSeats.find(
                      (s) =>
                        s.committee_conference_id === a.committee_conference_id &&
                        s.chair_profile_id === a.chair_profile_id
                    );
                    const label = seat ? `${seat.committeeLabel} — ${seat.chairName}` : `${a.committee_conference_id.slice(0, 8)}`;
                    return (
                      <li key={`${a.committee_conference_id}-${a.chair_profile_id}`} className="flex justify-between gap-2">
                        <span className="text-brand-muted tabular-nums w-5">{i + 1}.</span>
                        <span className="flex-1 min-w-0">{label}</span>
                        <span className="font-mono font-semibold text-brand-accent tabular-nums">
                          {a.avgTotal.toFixed(1)}{" "}
                          <span className="text-brand-muted font-normal">({a.responseCount})</span>
                        </span>
                      </li>
                    );
                  })}
                {delegateChairFeedback.every((a) => a.responseCount === 0) ? (
                  <li className="text-brand-muted text-xs">No delegate responses yet.</li>
                ) : null}
              </ol>
            </div>
            <div className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4">
              <h4 className="font-display text-sm font-semibold text-brand-navy mb-2">Chair report ranking (highest → lowest)</h4>
              <p className="text-[10px] uppercase tracking-wide text-brand-muted mb-2">Secretariat</p>
              <ol className="space-y-1.5 text-sm">
                {reportRanking.map((row, i) => (
                  <li key={row.committee.id} className="flex justify-between gap-2">
                    <span className="text-brand-muted tabular-nums w-5">{i + 1}.</span>
                    <span className="flex-1 min-w-0">{row.committee.label}</span>
                    <span className="font-mono font-semibold text-brand-accent tabular-nums">{row.total}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      ) : (
        <>
          {activeCommittee ? (
            <p className="font-display text-sm font-semibold text-brand-navy dark:text-zinc-100 px-1 pt-1">{activeCommittee.label}</p>
          ) : null}

          <section className="space-y-4">
            <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">
              Delegate feedback on chairs
            </h3>
            <p className="text-xs text-brand-muted">
              Mean rubric total per chair where at least one delegate has submitted a complete rubric and evidence statement.
              Individual responses are not visible to chairs or dais—SMT oversight only.
            </p>
            {seatsInCommittee.map((seat) => {
              const agg = delegateChairFeedback.find(
                (a) =>
                  a.committee_conference_id === seat.committee_conference_id &&
                  a.chair_profile_id === seat.chair_profile_id
              );
              const n = agg?.responseCount ?? 0;
              const avg = agg?.avgTotal ?? 0;
              return (
                <div
                  key={`df-${seat.committee_conference_id}-${seat.chair_profile_id}`}
                  className="rounded-xl border border-brand-navy/10 bg-brand-paper px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-medium text-brand-navy dark:text-zinc-100">
                    {seat.committeeLabel} — {seat.chairName}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-brand-muted">
                    {n === 0 ? (
                      <span>No responses yet</span>
                    ) : (
                      <>
                        mean {avg.toFixed(1)}/{maxDelegatePts} ({n} response{n === 1 ? "" : "s"})
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">Chairs (performance)</h3>
            {seatsInCommittee.map((seat) => {
              const pk = `${seat.committee_conference_id}:${seat.chair_profile_id}`;
              const scoreMap = chairScoreMap(seat.committee_conference_id, seat.chair_profile_id);
              const complete = isRubricScoresComplete(scoreMap, chairKeys);
              const total = rubricNumericTotalForKeys(scoreMap, chairKeys);
              const maxPts = maxPointsForParticipationScope("chair_by_smt");
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
                        fd.set("scope", "chair_by_smt");
                        fd.set("committee_conference_id", seat.committee_conference_id);
                        fd.set("subject_profile_id", seat.chair_profile_id);
                        submitForm(fd);
                      }}
                    >
                      <input type="hidden" name="scope" value="chair_by_smt" />
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
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {pending ? "Saving…" : "Save chair evaluation"}
                      </button>
                    </form>
                  </div>
                </details>
              );
            })}
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">Chair report</h3>
            {activeCommittee ? (
              <ChairReportEvalDetails
                committee={activeCommittee}
                scoreMap={reportScoreMap(activeCommittee.id)}
                reportKeys={reportKeys}
                reportCriteria={reportCriteria}
                pending={pending}
                submitForm={submitForm}
              />
            ) : (
              <p className="text-xs text-brand-muted">Select a committee tab.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
