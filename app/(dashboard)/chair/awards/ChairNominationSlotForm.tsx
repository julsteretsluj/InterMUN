"use client";

import { submitChairTopNominationAction } from "@/app/actions/awards";
import { dispatchChairAwardsSlotSaved } from "./AwardProgressBars";
import { RubricCriterionPicker } from "./RubricCriterionPicker";
import {
  maxRubricTotal,
  RUBRIC_KEYS_BY_NOMINATION,
  type NominationRubricType,
  type RubricCriterion,
} from "@/lib/seamuns-award-scoring";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const AUTOSAVE_MS = 60_000;

export type DelegateOption = { userId: string; label: string };

type Props = {
  committeeConferenceId: string;
  nominationType: NominationRubricType;
  rank: number;
  slotRequired: boolean;
  slotLabel: string;
  typeLabel: string;
  options: DelegateOption[];
  selectedNomineeId: string;
  scoreMap: Record<string, number>;
  evidenceNote: string | null;
  /** DB row id when this slot is already saved; drives remount after refresh. */
  nominationRowId: string | null;
  criteria: RubricCriterion[];
};

function shouldAttemptAutosave(
  form: HTMLFormElement,
  nominationType: NominationRubricType,
  slotRequired: boolean
): boolean {
  const fd = new FormData(form);
  const nominee = String(fd.get("nominee_profile_id") ?? "").trim();
  if (nominationType === "committee_honourable_mention" && !slotRequired && !nominee) {
    return true;
  }
  if (!nominee) return false;
  const keys = RUBRIC_KEYS_BY_NOMINATION[nominationType];
  for (const key of keys) {
    const raw = String(fd.get(`score_${key}`) ?? "").trim();
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 8) return false;
  }
  return true;
}

function scoresFromMap(scoreMap: Record<string, number>, keys: string[]): Record<string, number | null> {
  const o: Record<string, number | null> = {};
  for (const k of keys) {
    const n = Number(scoreMap[k] ?? 0);
    o[k] = n >= 1 && n <= 8 ? n : null;
  }
  return o;
}

export function ChairNominationSlotForm({
  committeeConferenceId,
  nominationType,
  rank,
  slotRequired,
  slotLabel,
  typeLabel,
  options,
  selectedNomineeId,
  scoreMap,
  evidenceNote,
  nominationRowId,
  criteria,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [autosaveMessage, setAutosaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const keys = useMemo(() => RUBRIC_KEYS_BY_NOMINATION[nominationType], [nominationType]);
  const scoreSnapshot = useMemo(() => JSON.stringify(scoreMap), [scoreMap]);
  const [liveScores, setLiveScores] = useState<Record<string, number | null>>(() =>
    scoresFromMap(scoreMap, keys)
  );

  useEffect(() => {
    setLiveScores(scoresFromMap(scoreMap, keys));
  }, [nominationType, nominationRowId, scoreSnapshot, keys]);

  const onCriterionScore = useCallback((key: string, score: number | null) => {
    setLiveScores((prev) => ({ ...prev, [key]: score }));
  }, []);

  const maxTotal = maxRubricTotal(nominationType);
  const criteriaTotal = useMemo(() => {
    return keys.reduce((sum, k) => {
      const v = liveScores[k];
      return v != null ? sum + v : sum;
    }, 0);
  }, [keys, liveScores]);

  const scoredCount = useMemo(
    () => keys.filter((k) => liveScores[k] != null).length,
    [keys, liveScores]
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitMessage(null);
    setAutosaveMessage(null);

    for (const k of keys) {
      const v = liveScores[k];
      if (v == null || v < 1 || v > 8) {
        setSubmitMessage(
          "Choose a proficiency band and Low or High for every criterion before saving."
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await submitChairTopNominationAction(new FormData(form));
      if (res.ok) {
        const nominee = String(new FormData(form).get("nominee_profile_id") ?? "").trim();
        const isHmClear =
          !nominee && nominationType === "committee_honourable_mention";
        if (!isHmClear) {
          dispatchChairAwardsSlotSaved(`${nominationType}:${rank}`);
        }
        await router.refresh();
        return;
      }
      setSubmitMessage(res.error);
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const id = window.setInterval(async () => {
      const form = formRef.current;
      if (!form) return;
      if (!shouldAttemptAutosave(form, nominationType, slotRequired)) return;
      const fd = new FormData(form);
      const res = await submitChairTopNominationAction(fd);
      if (res.ok) {
        const nominee = String(fd.get("nominee_profile_id") ?? "").trim();
        const isHmClear =
          !nominee && nominationType === "committee_honourable_mention";
        if (!isHmClear) {
          dispatchChairAwardsSlotSaved(`${nominationType}:${rank}`);
        }
        await router.refresh();
        setAutosaveMessage("Autosaved");
        window.setTimeout(() => setAutosaveMessage(null), 4000);
      }
    }, AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, [nominationType, rank, router, slotRequired]);

  const formKey =
    nominationRowId ?? `pending-${committeeConferenceId}-${nominationType}-${rank}`;

  return (
    <div key={formKey}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="committee_conference_id" value={committeeConferenceId} />
        <input type="hidden" name="nomination_type" value={nominationType} />
        <input type="hidden" name="rank" value={String(rank)} />
        <h4 className="text-sm font-semibold text-brand-navy">
          {slotLabel}
          {!slotRequired ? (
            <span className="ml-2 text-xs font-normal text-brand-muted">(optional)</span>
          ) : null}
        </h4>
        <label className="block text-sm">
          <span className="text-brand-muted text-xs uppercase">Nominee</span>
          <select
            name="nominee_profile_id"
            defaultValue={selectedNomineeId}
            required={slotRequired}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/25 text-brand-navy"
          >
            <option value="">{slotRequired ? "Select delegate" : "Leave blank for no submission"}</option>
            {options.map((o) => (
              <option key={`${nominationType}-${rank}-${o.userId}`} value={o.userId}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-white/12 bg-black/25 p-3 text-brand-navy space-y-2.5">
          <p className="text-brand-muted text-xs uppercase font-semibold tracking-wide">
            Criteria (pick a band, then Low or High within that band)
          </p>
          {criteria.map((criterion) => (
            <RubricCriterionPicker
              key={`${nominationType}-${rank}-${criterion.key}`}
              criterion={criterion}
              initialScore={Number(scoreMap[criterion.key] ?? 0)}
              onScoreChange={onCriterionScore}
            />
          ))}
          <p className="text-xs text-brand-muted pt-1">
            Rubric total:{" "}
            <strong className="text-brand-navy">
              {criteriaTotal}/{maxTotal}
            </strong>
            <span className="text-brand-muted">
              {" "}
              ({scoredCount}/{keys.length} criteria scored — 1–8 per criterion)
            </span>
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-brand-muted text-xs uppercase">Statement of confirmation / evidence</span>
          <textarea
            name="evidence_note"
            defaultValue={evidenceNote ?? ""}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/25 text-brand-navy placeholder:text-brand-muted/70"
            placeholder="Cite concrete floor evidence (clauses drafted, compromises brokered, key interventions)."
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-brand-gold text-white font-semibold disabled:opacity-60"
          >
            {isSaving ? "Saving…" : slotRequired ? `Save ${typeLabel} top ${rank}` : `Save optional ${typeLabel} slot`}
          </button>
          {autosaveMessage ? (
            <span className="text-xs text-brand-muted" aria-live="polite">
              {autosaveMessage}
            </span>
          ) : null}
        </div>
        {submitMessage ? (
          <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
            {submitMessage}
          </p>
        ) : null}
      </form>
    </div>
  );
}
