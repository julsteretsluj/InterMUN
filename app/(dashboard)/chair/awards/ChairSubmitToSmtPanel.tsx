"use client";

import { submitCommitteeAwardDraftsToSmtAction } from "@/app/actions/awards";
import { AWARD_SUBMISSION_DEADLINE_ISO, isPastAwardSubmissionDeadline } from "@/lib/award-submission";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("chairAwardsSubmit");
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
        <p className="font-semibold">{t("title")}</p>
        <p className="text-xs text-brand-muted leading-relaxed">
          {t("intro", { deadline: AWARD_SUBMISSION_DEADLINE_ISO })}
        </p>
        {!alreadySubmitted && requiredSlotsTotal > 0 ? (
          <p className="text-xs text-brand-navy/85">
            {requiredSlotsDone < requiredSlotsTotal
              ? t("requiredSlotsIncomplete", { done: requiredSlotsDone, total: requiredSlotsTotal })
              : t("requiredSlotsReady", { done: requiredSlotsDone, total: requiredSlotsTotal })}
          </p>
        ) : null}
        {!alreadySubmitted && delegateMatrixTotal > 0 ? (
          <p className="text-xs text-brand-navy/85">
            {delegateMatrixDone < delegateMatrixTotal
              ? t("matrixIncomplete", { done: delegateMatrixDone, total: delegateMatrixTotal })
              : t("matrixComplete", { done: delegateMatrixDone, total: delegateMatrixTotal })}
          </p>
        ) : null}
      </div>
      {alreadySubmitted ? (
        <p className="text-sm text-emerald-800 dark:text-emerald-200/90">
          {t("alreadySubmitted", {
            when: submittedAtLabel ? t("submittedAt", { time: submittedAtLabel }) : "",
          })}
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
              {busy ? t("submitting") : t("submitButton")}
            </button>
            {!canSubmit ? (
              <span className="text-xs text-brand-muted">
                {t("needComplete")}
              </span>
            ) : null}
            {pastDeadline ? (
              <span className="text-xs text-amber-800 dark:text-amber-200/85">
                {t("deadlinePassed")}
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
