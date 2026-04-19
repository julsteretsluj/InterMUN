"use client";

import { submitCommitteeAwardDraftsToSmtAction } from "@/app/actions/awards";
import { AWARD_SUBMISSION_DEADLINE_ISO, isPastAwardSubmissionDeadline } from "@/lib/award-submission";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  committeeConferenceId: string;
  canSubmit: boolean;
  alreadySubmitted: boolean;
  submittedAtLabel: string | null;
  /** Chairs only — SMT/admins viewing the page should not see the primary submit control. */
  showChairControls: boolean;
  /** Required slots complete / total (same rules as submit validation). */
  requiredSlotsDone: number;
  requiredSlotsTotal: number;
  /** Every-delegate matrix (session rubric); required before submit when there are seated delegates. */
  delegateMatrixDone?: number;
  delegateMatrixTotal?: number;
};

export function ChairSubmitToSmtPanel({
  committeeConferenceId,
  canSubmit,
  alreadySubmitted,
  submittedAtLabel,
  showChairControls,
  requiredSlotsDone,
  requiredSlotsTotal,
  delegateMatrixDone = 0,
  delegateMatrixTotal = 0,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pastDeadline = isPastAwardSubmissionDeadline();

  async function onSubmit() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await submitCommitteeAwardDraftsToSmtAction(committeeConferenceId);
      if (res.ok) {
        await router.refresh();
        return;
      }
      setMsg(res.error);
    } finally {
      setBusy(false);
    }
  }

  if (!showChairControls) {
    return null;
  }

  return (
    <div className="rounded-xl border border-brand-navy/12 bg-logo-cyan/10 p-4 space-y-3">
      <div className="text-sm text-brand-navy space-y-1">
        <p className="font-semibold">Submit to SMT</p>
        <p className="text-xs text-brand-muted leading-relaxed">
          Saving a slot only writes a <strong className="text-brand-navy/90">draft</strong>; SMT does not see it until
          you submit the batch below. When required slots are complete, send the batch to SMT for review. Automatic
          submission also runs after{" "}
          <time dateTime={AWARD_SUBMISSION_DEADLINE_ISO} className="font-mono text-[0.7rem] text-brand-navy/90">
            {AWARD_SUBMISSION_DEADLINE_ISO}
          </time>{" "}
          (UTC) when you open this page, or via a scheduled job if your deployment configures it.
        </p>
        {!alreadySubmitted && requiredSlotsTotal > 0 ? (
          <p className="text-xs text-brand-navy/85">
            Required slots complete:{" "}
            <strong className="tabular-nums">
              {requiredSlotsDone}/{requiredSlotsTotal}
            </strong>
            {requiredSlotsDone < requiredSlotsTotal
              ? " — finish the rest, then submit so SMT can review."
              : " — nomination batch is ready (ensure the delegate matrix above is complete)."}
          </p>
        ) : null}
        {!alreadySubmitted && delegateMatrixTotal > 0 ? (
          <p className="text-xs text-brand-navy/85">
            Delegate matrix (every seated delegate):{" "}
            <strong className="tabular-nums">
              {delegateMatrixDone}/{delegateMatrixTotal}
            </strong>
            {delegateMatrixDone < delegateMatrixTotal
              ? " — score each delegate above before submitting."
              : " — complete."}
          </p>
        ) : null}
      </div>
      {alreadySubmitted ? (
        <p className="text-sm text-emerald-800 dark:text-emerald-200/90">
          Submitted to SMT
          {submittedAtLabel ? ` — ${submittedAtLabel}` : ""}. Editing is locked; contact SMT if you need a change.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={() => void onSubmit()}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Submitting…" : "Submit nominations to SMT"}
            </button>
            {!canSubmit ? (
              <span className="text-xs text-brand-muted">
                Complete every required nomination slot and the delegate matrix, then submit.
              </span>
            ) : null}
            {pastDeadline ? (
              <span className="text-xs text-amber-800 dark:text-amber-200/85">
                Deadline passed — submit now if you have not already.
              </span>
            ) : null}
          </div>
          {msg ? (
            <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
              {msg}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
