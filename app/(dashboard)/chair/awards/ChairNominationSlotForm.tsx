"use client";

import { submitChairTopNominationAction } from "@/app/actions/awards";
import {
  maxRubricTotal,
  PROFICIENCY_BAND_LABEL,
  PROFICIENCY_BAND_ORDER,
  RUBRIC_KEYS_BY_NOMINATION,
  rubricNumericTotal,
  scoreToBand,
  type NominationRubricType,
  type RubricCriterion,
} from "@/lib/seamuns-award-scoring";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

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
    if (!String(fd.get(`band_${key}`) ?? "").trim()) return false;
  }
  return true;
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

  const maxTotal = maxRubricTotal(nominationType);
  const criteriaTotal = rubricNumericTotal(scoreMap, nominationType);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitMessage(null);
    setAutosaveMessage(null);
    setIsSaving(true);
    try {
      const res = await submitChairTopNominationAction(new FormData(form));
      if (res.ok) {
        router.refresh();
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
        router.refresh();
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
          Criteria (SEAMUNs bands — pick one per row)
        </p>
        {criteria.map((criterion) => {
          const existingScore = Number(scoreMap[criterion.key] ?? 0);
          const defaultBand = scoreToBand(existingScore);
          return (
            <fieldset
              key={`${nominationType}-${rank}-${criterion.key}`}
              className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-1.5"
            >
              <legend className="text-sm font-semibold text-brand-navy px-1">{criterion.label}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PROFICIENCY_BAND_ORDER.map((bandId, i) => {
                  const tone =
                    bandId === "beginning"
                      ? "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-950/20"
                      : bandId === "developing"
                        ? "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-950/20"
                        : bandId === "proficient"
                          ? "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/30 dark:bg-sky-950/20"
                          : "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-950/20";
                  return (
                    <label
                      key={bandId}
                      className={`flex gap-1.5 cursor-pointer rounded-lg border p-2 ${tone} has-[:checked]:ring-2 has-[:checked]:ring-brand-gold/60 has-[:checked]:border-brand-gold/70`}
                    >
                      <input
                        type="radio"
                        name={`band_${criterion.key}`}
                        value={bandId}
                        required={slotRequired}
                        defaultChecked={defaultBand === bandId}
                        className="mt-1 shrink-0"
                      />
                      <span className="min-w-0 text-xs leading-snug">
                        <span className="font-semibold text-brand-navy">
                          {PROFICIENCY_BAND_LABEL[bandId]}
                        </span>
                        <span className="block text-brand-navy/80 mt-0.5">{criterion.bandDescriptions[i]}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <p className="text-xs text-brand-muted pt-1">
          Rubric total:{" "}
          <strong className="text-brand-navy">
            {criteriaTotal}/{maxTotal}
          </strong>{" "}
          (stored on a 1–8 scale per criterion; bands map to 2 / 4 / 6 / 8)
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
