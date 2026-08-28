"use client";

import { submitChairTopNominationAction } from "@/app/actions/awards";
import { MIN_AWARD_EVIDENCE_CHARS } from "@/lib/award-evidence";
import { dispatchChairAwardsSlotSaved } from "./AwardProgressBars";
import { RubricCriterionPicker } from "./RubricCriterionPicker";
import {
  maxRubricTotal,
  RUBRIC_KEYS_BY_NOMINATION,
  type NominationRubricType,
  type RubricCriterion,
} from "@/lib/seamuns-award-scoring";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { DelegateFloorActivity } from "@/lib/delegate-floor-activity";
import { DelegateFloorActivitySection } from "./DelegateFloorActivitySection";
import { OverallAwardsProgress, SectionAwardsProgress } from "./AwardProgressBars";

export type NominationWizardOption = { userId: string; label: string };

export type NominationWizardDelegateInfo = { country: string; displayName: string };

export type NominationWizardRankingRow = {
  uid: string;
  label: string;
  total: number;
};

export type NominationWizardSlot = {
  nominationType: NominationRubricType;
  rank: number;
  required: boolean;
  slotLabel: string;
  typeLabel: string;
  helper: string;
  criteria: RubricCriterion[];
  options: NominationWizardOption[];
  selectedNomineeId: string;
  scoreMap: Record<string, number>;
  evidenceNote: string | null;
  nominationRowId: string | null;
  locked: boolean;
};

type Props = {
  committeeConferenceId: string;
  slots: NominationWizardSlot[];
  rankingDesc: NominationWizardRankingRow[];
  delegateByUserId: Record<string, NominationWizardDelegateInfo>;
  floorActivityByProfileId?: Record<string, DelegateFloorActivity>;
  nominationsLocked: boolean;
  serverCompletedKeys: string[];
  allRequiredKeys: string[];
};

function scoresFromMap(scoreMap: Record<string, number>, keys: string[]): Record<string, number | null> {
  const o: Record<string, number | null> = {};
  for (const k of keys) {
    const n = Number(scoreMap[k] ?? 0);
    o[k] = n >= 1 && n <= 8 ? n : null;
  }
  return o;
}

function isSlotCompleteLocal(
  slot: NominationWizardSlot,
  nomineeId: string,
  liveScores: Record<string, number | null>,
  keys: string[]
): boolean {
  if (!nomineeId) return !slot.required;
  return keys.every((k) => {
    const v = liveScores[k];
    return v != null && v >= 1 && v <= 8;
  });
}

export function ChairNominationsWizard({
  committeeConferenceId,
  slots,
  rankingDesc,
  delegateByUserId,
  floorActivityByProfileId = {},
  nominationsLocked,
  serverCompletedKeys,
  allRequiredKeys,
}: Props) {
  const t = useTranslations("chairAwardsNominations");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(() => {
    const firstIncomplete = slots.findIndex((s) => {
      const key = `${s.nominationType}:${s.rank}`;
      if (!s.required && !s.selectedNomineeId) return false;
      return !serverCompletedKeys.includes(key);
    });
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [search, setSearch] = useState("");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const slot = slots[stepIndex] ?? null;
  const keys = useMemo(
    () => (slot ? RUBRIC_KEYS_BY_NOMINATION[slot.nominationType] : []),
    [slot]
  );

  const [nomineeId, setNomineeId] = useState(slot?.selectedNomineeId ?? "");
  const [liveScores, setLiveScores] = useState<Record<string, number | null>>(() =>
    scoresFromMap(slot?.scoreMap ?? {}, keys)
  );
  const [evidence, setEvidence] = useState(slot?.evidenceNote ?? "");

  // Re-seed when step or server snapshot changes (adjust during render).
  const [prevSlotSync, setPrevSlotSync] = useState({
    stepIndex,
    rowId: slot?.nominationRowId ?? null,
    selected: slot?.selectedNomineeId ?? "",
    scoreSnap: JSON.stringify(slot?.scoreMap ?? {}),
    evidenceSnap: slot?.evidenceNote ?? "",
  });
  if (
    slot &&
    (prevSlotSync.stepIndex !== stepIndex ||
      prevSlotSync.rowId !== (slot.nominationRowId ?? null) ||
      prevSlotSync.selected !== slot.selectedNomineeId ||
      prevSlotSync.scoreSnap !== JSON.stringify(slot.scoreMap) ||
      prevSlotSync.evidenceSnap !== (slot.evidenceNote ?? ""))
  ) {
    setPrevSlotSync({
      stepIndex,
      rowId: slot.nominationRowId ?? null,
      selected: slot.selectedNomineeId,
      scoreSnap: JSON.stringify(slot.scoreMap),
      evidenceSnap: slot.evidenceNote ?? "",
    });
    setNomineeId(slot.selectedNomineeId);
    setLiveScores(scoresFromMap(slot.scoreMap, RUBRIC_KEYS_BY_NOMINATION[slot.nominationType]));
    setEvidence(slot.evidenceNote ?? "");
    setSearch("");
    setSubmitMessage(null);
  }

  const usedNomineeIds = useMemo(() => {
    if (!slot) return new Set<string>();
    const used = new Set<string>();
    for (const s of slots) {
      if (s.nominationType !== slot.nominationType) continue;
      if (s.rank === slot.rank) continue;
      if (s.selectedNomineeId) used.add(s.selectedNomineeId);
    }
    used.delete(nomineeId);
    return used;
  }, [slots, slot, nomineeId]);

  const topSuggestions = useMemo(() => {
    if (!slot) return [];
    return rankingDesc.filter((r) => !usedNomineeIds.has(r.uid)).slice(0, 5);
  }, [rankingDesc, usedNomineeIds, slot]);

  const searchResults = useMemo(() => {
    if (!slot) return [];
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return slot.options
      .filter((o) => !usedNomineeIds.has(o.userId) || o.userId === nomineeId)
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [slot, search, usedNomineeIds, nomineeId]);

  const onCriterionScore = useCallback((key: string, score: number | null) => {
    setLiveScores((prev) => ({ ...prev, [key]: score }));
  }, []);

  const maxTotal = slot ? maxRubricTotal(slot.nominationType) : 0;
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

  const typesForProgress = useMemo(() => {
    const seen = new Map<NominationRubricType, NominationWizardSlot[]>();
    for (const s of slots) {
      const list = seen.get(s.nominationType) ?? [];
      list.push(s);
      seen.set(s.nominationType, list);
    }
    return [...seen.entries()];
  }, [slots]);

  const formDisabled = Boolean(slot?.locked || nominationsLocked);
  const summaryDelegate = nomineeId ? delegateByUserId[nomineeId] : undefined;
  const stepComplete = slot ? isSlotCompleteLocal(slot, nomineeId, liveScores, keys) : false;

  const goToStep = (index: number) => {
    setStepIndex(Math.max(0, Math.min(slots.length - 1, index)));
  };

  const saveNomination = (opts?: { clearOptional?: boolean }) => {
    if (!slot || formDisabled) return;
    setSubmitMessage(null);

    const clearOptional = Boolean(opts?.clearOptional);
    const nextNominee = clearOptional ? "" : nomineeId;

    if (!clearOptional) {
      if (slot.required && !nextNominee) {
        setSubmitMessage(t("errors.selectNominee"));
        return;
      }
      if (nextNominee) {
        for (const k of keys) {
          const v = liveScores[k];
          if (v == null || v < 1 || v > 8) {
            setSubmitMessage(t("errors.completeRubric"));
            return;
          }
        }
        if (evidence.trim().length < MIN_AWARD_EVIDENCE_CHARS) {
          setSubmitMessage(t("errors.evidenceMin", { min: MIN_AWARD_EVIDENCE_CHARS }));
          return;
        }
      } else if (slot.required) {
        setSubmitMessage(t("errors.selectNominee"));
        return;
      }
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("committee_conference_id", committeeConferenceId);
      fd.set("nomination_type", slot.nominationType);
      fd.set("rank", String(slot.rank));
      fd.set("nominee_profile_id", nextNominee);
      fd.set("evidence_note", clearOptional ? "" : evidence);
      if (nextNominee) {
        for (const key of keys) {
          const v = liveScores[key];
          if (v != null) fd.set(`score_${key}`, String(v));
        }
      }

      const res = await submitChairTopNominationAction(fd);
      if (!res.ok) {
        setSubmitMessage(res.error);
        return;
      }
      if (nextNominee) {
        dispatchChairAwardsSlotSaved(`${slot.nominationType}:${slot.rank}`);
      }
      await router.refresh();
      if (stepIndex < slots.length - 1) {
        setStepIndex(stepIndex + 1);
      }
    });
  };

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-[#D1D1D6] bg-[#FBFBFD] px-4 py-3 text-sm text-[#6E6E73]">
        {t("empty")}
      </div>
    );
  }

  if (!slot) return null;

  return (
    <div className="space-y-5">
      <OverallAwardsProgress serverCompletedKeys={serverCompletedKeys} allRequiredKeys={allRequiredKeys} />

      <div className="rounded-xl border border-[#D1D1D6] bg-[#F5F5F7]/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E6E73]">
          <span className="font-semibold uppercase tracking-wide text-[#1D1D1F]">
            {t("stepProgress", { current: stepIndex + 1, total: slots.length })}
          </span>
          <span>
            {t("requiredProgress", {
              done: allRequiredKeys.filter((k) => serverCompletedKeys.includes(k)).length,
              total: allRequiredKeys.length,
            })}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {slots.map((s, i) => {
            const key = `${s.nominationType}:${s.rank}`;
            const done = serverCompletedKeys.includes(key) || (i === stepIndex && stepComplete && Boolean(nomineeId));
            return (
              <button
                key={key}
                type="button"
                onClick={() => goToStep(i)}
                title={`${s.typeLabel} · ${s.slotLabel}`}
                className={cn(
                  "h-2.5 w-2.5 rounded-full border transition-colors",
                  i === stepIndex ? "ring-2 ring-[#007AFF]/55 ring-offset-1 ring-offset-[#F5F5F7]" : "",
                  done ? "border-emerald-500 bg-emerald-500" : "border-[#1D1D1F]/30 bg-transparent"
                )}
                aria-label={t("gotoStep", { label: s.slotLabel })}
                aria-current={i === stepIndex}
              />
            );
          })}
        </div>
      </div>

      {nominationsLocked ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">{t("lockedTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed">{t("lockedBody")}</p>
        </div>
      ) : null}

      <section className="rounded-xl border border-[#D1D1D6] bg-[#FBFBFD] p-4 md:p-5 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6E6E73]">{slot.typeLabel}</p>
          <h3 className="mt-0.5 font-sans text-lg font-semibold text-[#1D1D1F]">
            {slot.slotLabel}
            {!slot.required ? (
              <span className="ml-2 text-xs font-normal text-[#6E6E73]">({t("optional")})</span>
            ) : null}
          </h3>
          <p className="mt-1 text-xs text-[#6E6E73] leading-relaxed">{slot.helper}</p>
          <div className="mt-2">
            <SectionAwardsProgress
              nominationType={slot.nominationType}
              requiredRanks={slots
                .filter((s) => s.nominationType === slot.nominationType && s.required)
                .map((s) => s.rank)}
              optionalRanks={slots
                .filter((s) => s.nominationType === slot.nominationType && !s.required)
                .map((s) => s.rank)}
              serverCompletedKeys={serverCompletedKeys}
            />
          </div>
        </div>

        {slot.locked ? (
          <p className="text-xs text-emerald-800">{t("submittedLocked")}</p>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">{t("topSuggestions")}</p>
          <p className="text-xs text-[#6E6E73]">{t("topSuggestionsHint")}</p>
          <ul className="flex flex-wrap gap-2">
            {topSuggestions.length === 0 ? (
              <li className="text-xs text-[#6E6E73]">{t("noSuggestions")}</li>
            ) : (
              topSuggestions.map((r, i) => {
                const info = delegateByUserId[r.uid];
                const selected = nomineeId === r.uid;
                return (
                  <li key={r.uid}>
                    <button
                      type="button"
                      disabled={formDisabled}
                      onClick={() => setNomineeId(r.uid)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                        selected
                          ? "border-[#007AFF] bg-[#007AFF] text-white"
                          : "border-[#D1D1D6] bg-white text-[#1D1D1F] hover:border-[#007AFF]/50",
                        formDisabled && "opacity-60"
                      )}
                    >
                      <span className="tabular-nums text-[0.65rem] opacity-80">#{i + 1}</span>
                      <span aria-hidden>{flagEmojiForCountryName(info?.country)}</span>
                      <span className="font-medium">{info?.country ?? r.label}</span>
                      <span className={cn("font-mono tabular-nums", selected ? "text-white/85" : "text-[#007AFF]")}>
                        {r.total}
                      </span>
                      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6E6E73]" htmlFor="nomination-search">
            {t("searchLabel")}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" aria-hidden />
            <input
              id="nomination-search"
              type="search"
              value={search}
              disabled={formDisabled}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-[#D1D1D6] bg-white py-2 pl-9 pr-3 text-sm text-[#1D1D1F] placeholder:text-[#6E6E73]/70 disabled:opacity-60"
            />
          </div>
          {search.trim() ? (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-[#D1D1D6] bg-white divide-y divide-[#D1D1D6]/80">
              {searchResults.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[#6E6E73]">{t("searchEmpty")}</li>
              ) : (
                searchResults.map((o) => {
                  const info = delegateByUserId[o.userId];
                  const selected = nomineeId === o.userId;
                  return (
                    <li key={o.userId}>
                      <button
                        type="button"
                        disabled={formDisabled}
                        onClick={() => {
                          setNomineeId(o.userId);
                          setSearch("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F5F5F7]",
                          selected && "bg-[#F5F5F7]"
                        )}
                      >
                        <span aria-hidden>{flagEmojiForCountryName(info?.country)}</span>
                        <span className="min-w-0 flex-1 truncate text-[#1D1D1F]">{o.label}</span>
                        {selected ? <Check className="h-4 w-4 shrink-0 text-[#007AFF]" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>

        {nomineeId ? (
          <div className="rounded-xl border border-[#007AFF]/30 bg-[#F5F5F7]/80 px-3 py-2.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#6E6E73]">{t("selectedNominee")}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#1D1D1F]">
              <span aria-hidden>{flagEmojiForCountryName(summaryDelegate?.country)}</span>
              <span>
                {summaryDelegate
                  ? `${summaryDelegate.country} — ${summaryDelegate.displayName}`
                  : nomineeId.slice(0, 8)}
              </span>
            </p>
            <div className="mt-2">
              <DelegateFloorActivitySection activity={floorActivityByProfileId[nomineeId]} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#6E6E73]">{t("pickNomineeHint")}</p>
        )}

        {nomineeId ? (
          <div className="rounded-xl border border-[#D1D1D6] bg-white/70 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">{t("rubricHeading")}</p>
            {slot.criteria.map((criterion) => (
              <RubricCriterionPicker
                key={`${slot.nominationType}-${slot.rank}-${nomineeId}-${criterion.key}`}
                criterion={criterion}
                initialScore={Number(liveScores[criterion.key] ?? 0)}
                onScoreChange={onCriterionScore}
                disabled={formDisabled}
              />
            ))}
            <p className="text-xs text-[#6E6E73]">
              {t("rubricTotal", {
                total: criteriaTotal,
                max: maxTotal,
                scored: scoredCount,
                criteria: keys.length,
              })}
            </p>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
                {t("evidenceLabel")}
              </span>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={3}
                minLength={MIN_AWARD_EVIDENCE_CHARS}
                required={!formDisabled}
                readOnly={formDisabled}
                disabled={formDisabled}
                className="mt-1 w-full rounded-lg border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1D1D1F] placeholder:text-[#6E6E73]/70 read-only:opacity-70"
                placeholder={t("evidencePlaceholder", { min: MIN_AWARD_EVIDENCE_CHARS })}
              />
            </label>
          </div>
        ) : null}

        {submitMessage ? (
          <p className="text-sm text-rose-700" role="alert">
            {submitMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="rounded-lg border border-[#D1D1D6] bg-white px-3 py-2 text-sm font-medium text-[#1D1D1F] disabled:opacity-40"
          >
            {t("previous")}
          </button>
          <div className="flex flex-wrap gap-2">
            {!slot.required && !slot.locked && !nominationsLocked ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => saveNomination({ clearOptional: true })}
                className="rounded-lg border border-[#D1D1D6] bg-white px-3 py-2 text-sm font-medium text-[#1D1D1F] disabled:opacity-50"
              >
                {t("skipOptional")}
              </button>
            ) : null}
            {stepIndex < slots.length - 1 && !nomineeId && !slot.required ? (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="rounded-lg border border-[#D1D1D6] bg-white px-3 py-2 text-sm font-medium text-[#1D1D1F]"
              >
                {t("next")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending || formDisabled || (slot.required && !nomineeId)}
              onClick={() => saveNomination()}
              className="rounded-lg bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {slot.locked
                ? t("locked")
                : nominationsLocked
                  ? t("matrixRequired")
                  : pending
                    ? t("saving")
                    : stepIndex < slots.length - 1
                      ? t("saveAndNext")
                      : t("save")}
            </button>
          </div>
        </div>
      </section>

      <details className="rounded-xl border border-[#D1D1D6] bg-[#FBFBFD] px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#1D1D1F]">{t("allSlotsSummary")}</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {typesForProgress.map(([typeId, typeSlots]) => (
            <li key={typeId} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
                {typeSlots[0]?.typeLabel}
              </p>
              <ul className="space-y-1 pl-1">
                {typeSlots.map((s) => {
                  const key = `${s.nominationType}:${s.rank}`;
                  const done = serverCompletedKeys.includes(key);
                  const idx = slots.findIndex(
                    (x) => x.nominationType === s.nominationType && x.rank === s.rank
                  );
                  const nom = s.selectedNomineeId ? delegateByUserId[s.selectedNomineeId] : null;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => goToStep(idx)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#F5F5F7]"
                      >
                        <span className="min-w-0 truncate text-[#1D1D1F]">
                          {s.slotLabel}
                          {nom ? ` — ${nom.country}` : ""}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                            done
                              ? "bg-emerald-500/15 text-emerald-900"
                              : "bg-amber-500/15 text-amber-950"
                          )}
                        >
                          {done ? t("statusDone") : t("statusTodo")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
