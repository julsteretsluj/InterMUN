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
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const AUTOSAVE_MS = 60_000;

export type DelegateOption = { userId: string; label: string };

export type DelegateInfo = { country: string; displayName: string };

type Props = {
  committeeConferenceId: string;
  nominationType: NominationRubricType;
  rank: number;
  slotRequired: boolean;
  slotLabel: string;
  typeLabel: string;
  options: DelegateOption[];
  delegateByUserId: Record<string, DelegateInfo>;
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
  slotRequired: boolean,
  keys: string[],
  liveScores: Record<string, number | null>
): boolean {
  const fd = new FormData(form);
  const nominee = String(fd.get("nominee_profile_id") ?? "").trim();
  if (nominationType === "committee_honourable_mention" && !slotRequired && !nominee) {
    return true;
  }
  if (!nominee) return false;
  for (const key of keys) {
    const v = liveScores[key];
    if (v == null || v < 1 || v > 8) return false;
  }
  return true;
}

/** Hidden rubric inputs can lag React state; always send scores from liveScores to the server action. */
function formDataWithRubricScores(
  form: HTMLFormElement,
  keys: string[],
  liveScores: Record<string, number | null>
): FormData {
  const fd = new FormData(form);
  for (const key of keys) {
    const v = liveScores[key];
    if (v != null && v >= 1 && v <= 8) {
      fd.set(`score_${key}`, String(v));
    }
  }
  return fd;
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
  delegateByUserId,
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
  const [minimized, setMinimized] = useState(false);
  const [nomineeId, setNomineeId] = useState(selectedNomineeId);

  const keys = useMemo(() => RUBRIC_KEYS_BY_NOMINATION[nominationType], [nominationType]);
  const scoreSnapshot = useMemo(() => JSON.stringify(scoreMap), [scoreMap]);
  const [liveScores, setLiveScores] = useState<Record<string, number | null>>(() =>
    scoresFromMap(scoreMap, keys)
  );
  const liveScoresRef = useRef(liveScores);

  useEffect(() => {
    setLiveScores(scoresFromMap(scoreMap, keys));
  }, [nominationType, nominationRowId, scoreSnapshot, keys]);

  useEffect(() => {
    setNomineeId(selectedNomineeId);
  }, [selectedNomineeId, nominationRowId]);

  useEffect(() => {
    liveScoresRef.current = liveScores;
  }, [liveScores]);

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

  const summaryDelegate = nomineeId ? delegateByUserId[nomineeId] : undefined;
  const summaryFlag = flagEmojiForCountryName(summaryDelegate?.country);
  const summaryName = summaryDelegate?.displayName ?? (nomineeId ? nomineeId.slice(0, 8) : "—");
  const nominationSummary = `${typeLabel} · ${slotLabel}`;

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
      const res = await submitChairTopNominationAction(formDataWithRubricScores(form, keys, liveScores));
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
      if (!shouldAttemptAutosave(form, nominationType, slotRequired, keys, liveScoresRef.current)) return;
      const fd = formDataWithRubricScores(form, keys, liveScoresRef.current);
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
  }, [keys, nominationType, rank, router, slotRequired]);

  const formKey =
    nominationRowId ?? `pending-${committeeConferenceId}-${nominationType}-${rank}`;

  return (
    <div key={formKey} className="rounded-xl border border-brand-navy/10 bg-sky-50/40 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-3 py-2.5 border-b border-brand-navy/10 bg-sky-50/70">
        {minimized ? (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="flex flex-1 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-left rounded-lg -m-1 p-1 hover:bg-brand-navy/5 transition-colors"
            aria-expanded="false"
            aria-label="Expand to edit nomination"
          >
            <span className="text-xl leading-none shrink-0" title={summaryDelegate?.country ?? "Allocation"}>
              {summaryFlag}
            </span>
            <span className="min-w-0">
              <span className="font-semibold text-brand-navy block truncate">{summaryName}</span>
              <span className="text-xs text-brand-muted block truncate">{nominationSummary}</span>
            </span>
            <span className="ml-auto shrink-0 text-sm tabular-nums">
              <span className="font-semibold text-brand-navy">{criteriaTotal}</span>
              <span className="text-brand-muted">/{maxTotal}</span>
              {scoredCount < keys.length ? (
                <span className="text-[0.65rem] text-brand-muted ml-1">({scoredCount}/{keys.length} criteria)</span>
              ) : null}
            </span>
            <ChevronDown className="w-5 h-5 text-brand-muted shrink-0" aria-hidden />
          </button>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-brand-navy">
                {slotLabel}
                {!slotRequired ? (
                  <span className="ml-2 text-xs font-normal text-brand-muted">(optional)</span>
                ) : null}
              </h4>
              <p className="text-[0.7rem] text-brand-muted mt-0.5">{typeLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border border-brand-navy/15 bg-white/40 text-xs font-medium text-brand-navy hover:bg-white/70"
              aria-expanded="true"
              aria-label="Minimize; show summary only"
            >
              <span>Minimize</span>
              <ChevronUp className="w-4 h-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className={minimized ? "hidden" : "p-3 pt-3"}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="committee_conference_id" value={committeeConferenceId} />
        <input type="hidden" name="nomination_type" value={nominationType} />
        <input type="hidden" name="rank" value={String(rank)} />
        <label className="block text-sm">
          <span className="text-brand-muted text-xs uppercase">Nominee</span>
          <select
            name="nominee_profile_id"
            value={nomineeId}
            onChange={(e) => setNomineeId(e.target.value)}
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
            className="px-4 py-2 rounded-lg bg-brand-accent text-white font-semibold disabled:opacity-60"
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
    </div>
  );
}
