"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { saveAwardParticipationScore } from "@/app/actions/award-participation";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import {
  rubricNumericTotalForKeys,
  rubricKeysForParticipationScope,
  maxPointsForParticipationScope,
  isRubricScoresComplete,
} from "@/lib/award-participation-scoring";
import { DELEGATE_CRITERIA } from "@/lib/seamuns-award-scoring";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { DelegateFloorActivity } from "@/lib/delegate-floor-activity";
import { DelegateFloorActivitySection } from "./DelegateFloorActivitySection";

type DelegateRow = {
  userId: string;
  country: string;
  displayName: string;
};

type Props = {
  committeeConferenceId: string;
  delegates: DelegateRow[];
  scoresByProfileId: Record<string, Record<string, number>>;
  floorActivityByProfileId?: Record<string, DelegateFloorActivity>;
  /** Kept for page compatibility; cards+modal is the primary UX. */
  defaultGuided?: boolean;
};

function compareDelegates(a: DelegateRow, b: DelegateRow): number {
  const byCountry = a.country.localeCompare(b.country);
  if (byCountry !== 0) return byCountry;
  return a.displayName.localeCompare(b.displayName);
}

export function DelegateMatrixPanel({
  committeeConferenceId,
  delegates,
  scoresByProfileId,
  floorActivityByProfileId = {},
}: Props) {
  const t = useTranslations("chairAwardsDelegateMatrix");
  const titleId = useId();
  const keys = useMemo(() => rubricKeysForParticipationScope("delegate_by_chair"), []);
  const maxPts = maxPointsForParticipationScope("delegate_by_chair");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [liveByProfile, setLiveByProfile] = useState<Record<string, Record<string, number>>>(() => ({
    ...scoresByProfileId,
  }));
  const [savingByProfile, setSavingByProfile] = useState<Record<string, boolean>>({});
  const [saveStateByProfile, setSaveStateByProfile] = useState<
    Record<string, "saving" | "saved" | "error" | null>
  >({});
  const dirtyProfilesRef = useRef<Set<string>>(new Set());
  const saveTimersRef = useRef<Record<string, number>>({});
  const saveStateTimersRef = useRef<Record<string, number>>({});
  const saveInFlightRef = useRef<Set<string>>(new Set());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isCompleteFor = useCallback(
    (profileId: string, source: Record<string, Record<string, number>> = liveByProfile) =>
      isRubricScoresComplete(source[profileId] ?? null, keys),
    [liveByProfile, keys]
  );

  const sortedDelegates = useMemo(() => {
    return [...delegates].sort((a, b) => {
      const aDone = isCompleteFor(a.userId);
      const bDone = isCompleteFor(b.userId);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return compareDelegates(a, b);
    });
  }, [delegates, isCompleteFor]);

  useEffect(() => {
    setLiveByProfile((prev) => {
      const next = { ...prev };
      for (const [profileId, scores] of Object.entries(scoresByProfileId)) {
        if (!dirtyProfilesRef.current.has(profileId)) {
          next[profileId] = scores;
        }
      }
      return next;
    });
  }, [scoresByProfileId]);

  useEffect(() => {
    const saveTimers = saveTimersRef.current;
    const saveStateTimers = saveStateTimersRef.current;
    return () => {
      for (const id of Object.keys(saveTimers)) {
        window.clearTimeout(saveTimers[id]);
      }
      for (const id of Object.keys(saveStateTimers)) {
        window.clearTimeout(saveStateTimers[id]);
      }
    };
  }, []);

  const saveScores = useCallback(
    (profileId: string, scoreMap: Record<string, number>, onSaved?: () => void) => {
      if (!isRubricScoresComplete(scoreMap, keys)) return;
      if (saveInFlightRef.current.has(profileId)) return;
      saveInFlightRef.current.add(profileId);
      setSavingByProfile((prev) => ({ ...prev, [profileId]: true }));
      setSaveStateByProfile((prev) => ({ ...prev, [profileId]: "saving" }));
      setMsg(null);
      startTransition(async () => {
        const fd = new FormData();
        fd.set("scope", "delegate_by_chair");
        fd.set("committee_conference_id", committeeConferenceId);
        fd.set("subject_profile_id", profileId);
        for (const key of keys) {
          fd.set(`score_${key}`, String(scoreMap[key]));
        }
        const res = await saveAwardParticipationScore(fd);
        saveInFlightRef.current.delete(profileId);
        setSavingByProfile((prev) => ({ ...prev, [profileId]: false }));
        if (res.error) {
          setMsg(res.error);
          setSaveStateByProfile((prev) => ({ ...prev, [profileId]: "error" }));
          return;
        }
        dirtyProfilesRef.current.delete(profileId);
        const delegate = delegates.find((d) => d.userId === profileId);
        setMsg(t("autosavedWithCountry", { country: delegate?.country ?? t("delegateFallback") }));
        setSaveStateByProfile((prev) => ({ ...prev, [profileId]: "saved" }));
        if (saveStateTimersRef.current[profileId]) {
          window.clearTimeout(saveStateTimersRef.current[profileId]);
        }
        saveStateTimersRef.current[profileId] = window.setTimeout(() => {
          setSaveStateByProfile((prev) => ({ ...prev, [profileId]: null }));
        }, 2200);
        onSaved?.();
      });
    },
    [committeeConferenceId, delegates, keys, startTransition, t]
  );

  const handleScore = useCallback(
    (profileId: string, key: string, score: number | null) => {
      setLiveByProfile((prev) => {
        const row = { ...(prev[profileId] ?? {}) };
        const prevVal = row[key];
        const nextVal = score != null && score >= 1 ? score : undefined;
        if (prevVal === nextVal) return prev;

        if (nextVal === undefined) delete row[key];
        else row[key] = nextVal;
        const next = { ...prev, [profileId]: row };
        dirtyProfilesRef.current.add(profileId);

        const existingTimer = saveTimersRef.current[profileId];
        if (existingTimer) window.clearTimeout(existingTimer);
        saveTimersRef.current[profileId] = window.setTimeout(() => {
          const latest = next[profileId] ?? {};
          if (!dirtyProfilesRef.current.has(profileId)) return;
          if (!isRubricScoresComplete(latest, keys)) return;
          saveScores(profileId, latest);
        }, 900);
        return next;
      });
    },
    [keys, saveScores]
  );

  const flushSave = useCallback(
    (profileId: string) => {
      const timer = saveTimersRef.current[profileId];
      if (timer) {
        window.clearTimeout(timer);
        delete saveTimersRef.current[profileId];
      }
      if (dirtyProfilesRef.current.has(profileId)) {
        const scoreMap = liveByProfile[profileId] ?? {};
        if (isRubricScoresComplete(scoreMap, keys)) saveScores(profileId, scoreMap);
      }
    },
    [liveByProfile, keys, saveScores]
  );

  const closeModal = useCallback(() => {
    if (activeUserId) flushSave(activeUserId);
    setActiveUserId(null);
  }, [activeUserId, flushSave]);

  useEffect(() => {
    if (!activeUserId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeUserId, closeModal]);

  const completeCount = sortedDelegates.filter((d) => isCompleteFor(d.userId)).length;
  const unscoredDelegates = sortedDelegates.filter((d) => !isCompleteFor(d.userId));
  const activeDelegate = activeUserId
    ? sortedDelegates.find((d) => d.userId === activeUserId) ?? null
    : null;
  const activeScoreMap = activeDelegate ? liveByProfile[activeDelegate.userId] ?? {} : {};
  const activeComplete = activeDelegate ? isCompleteFor(activeDelegate.userId) : false;

  if (delegates.length === 0) {
    return (
      <section
        id="delegate-matrix"
        className="rounded-xl border border-brand-navy/12 bg-brand-paper p-4 md:p-6 space-y-3"
      >
        <div>
          <h3 className="font-sans text-lg font-semibold text-brand-navy dark:text-zinc-100">
            {t("title")}
          </h3>
          <p className="mt-1 text-xs text-brand-muted leading-relaxed">{t("emptyBody")}</p>
        </div>
        <Link
          href="/chair/allocation-matrix"
          className="inline-flex rounded-lg bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("emptyCta")}
        </Link>
      </section>
    );
  }

  const modal =
    mounted && activeDelegate
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-[#1D1D1F]/45 px-3 py-4 sm:items-center sm:px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={closeModal}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#D1D1D6] bg-[#FBFBFD] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#D1D1D6] bg-[#F5F5F7] px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <p className="text-2xl leading-none" aria-hidden>
                    {flagEmojiForCountryName(activeDelegate.country)}
                  </p>
                  <h3 id={titleId} className="mt-1 font-sans text-lg font-semibold text-[#1D1D1F]">
                    {activeDelegate.country}
                  </h3>
                  <p className="text-sm text-[#6E6E73]">{activeDelegate.displayName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-mono text-xs tabular-nums",
                      activeComplete
                        ? "bg-emerald-500/15 text-emerald-900"
                        : "bg-amber-500/15 text-amber-950"
                    )}
                  >
                    {rubricNumericTotalForKeys(activeScoreMap, keys)}/{maxPts}
                  </span>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-[#D1D1D6] bg-white/80 p-1.5 text-[#6E6E73] hover:bg-white"
                    aria-label={t("closeModal")}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5">
                <DelegateFloorActivitySection activity={floorActivityByProfileId[activeDelegate.userId]} />
                <p className="text-xs text-[#6E6E73]">{t("modalHint")}</p>
                <div className="grid gap-3">
                  {DELEGATE_CRITERIA.map((criterion) => (
                    <RubricCriterionPicker
                      key={`${activeDelegate.userId}-${criterion.key}`}
                      criterion={criterion}
                      initialScore={Number(activeScoreMap[criterion.key] ?? 0)}
                      onScoreChange={(key, score) => handleScore(activeDelegate.userId, key, score)}
                      disabled={false}
                    />
                  ))}
                </div>
                {saveStateByProfile[activeDelegate.userId] === "saved" ? (
                  <span className="text-xs text-emerald-700">{t("autosaved")}</span>
                ) : saveStateByProfile[activeDelegate.userId] === "error" ? (
                  <span className="text-xs text-rose-700">{t("autosaveFailed")}</span>
                ) : !activeComplete ? (
                  <p className="text-xs text-[#6E6E73]">{t("currentIncomplete")}</p>
                ) : null}
              </div>

              <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#D1D1D6] bg-[#F5F5F7]/80 px-4 py-3 md:px-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-[#D1D1D6] bg-white px-3 py-2 text-sm font-medium text-[#1D1D1F]"
                >
                  {t("closeModal")}
                </button>
                <button
                  type="button"
                  disabled={
                    pending ||
                    Boolean(savingByProfile[activeDelegate.userId]) ||
                    !activeComplete
                  }
                  onClick={() => {
                    saveScores(activeDelegate.userId, activeScoreMap, () => {
                      setActiveUserId(null);
                    });
                  }}
                  className="rounded-lg bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingByProfile[activeDelegate.userId] ? t("saving") : t("saveAndClose")}
                </button>
              </footer>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <section
      id="delegate-matrix"
      className="rounded-xl border border-brand-navy/12 bg-brand-paper p-4 md:p-6 space-y-4"
    >
      <div>
        <h3 className="font-sans text-lg font-semibold text-brand-navy dark:text-zinc-100">
          {t("title")}
        </h3>
        <p className="mt-1 text-xs text-brand-muted leading-relaxed">
          {t.rich("intro", {
            strong: (chunks) => <strong>{chunks}</strong>,
            completeCount,
            total: sortedDelegates.length,
          })}
        </p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#6E6E73]">
            <span className="font-medium text-[#1D1D1F]">{t("cardProgressLabel")}</span>
            <span>
              {completeCount}/{sortedDelegates.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1D1D1F]/10">
            <div
              className="h-full rounded-full bg-[#007AFF] transition-[width] duration-300"
              style={{
                width: `${sortedDelegates.length ? (completeCount / sortedDelegates.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {unscoredDelegates.length > 0 ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20 space-y-2">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{t("unscoredBannerTitle")}</p>
          <p className="text-xs text-amber-900/90 dark:text-amber-100/85">{t("unscoredBannerBody")}</p>
          <p className="text-xs font-medium text-amber-950 dark:text-amber-100">{t("unscoredListLabel")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {unscoredDelegates.map((d) => (
              <li key={d.userId}>
                <button
                  type="button"
                  onClick={() => setActiveUserId(d.userId)}
                  className="rounded-full border border-amber-500/40 bg-white/70 px-2.5 py-0.5 text-xs font-medium text-amber-950 hover:border-[#007AFF]/50 dark:bg-black/20 dark:text-amber-100"
                >
                  {d.country}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">
          <p className="font-semibold">{t("allScoredTitle")}</p>
          <p className="mt-0.5 text-xs">{t("allScoredBody")}</p>
        </div>
      )}

      {msg ? (
        <p className="text-xs text-brand-navy dark:text-zinc-200 bg-[#007AFF]/10 border border-[#007AFF]/25 rounded-lg px-3 py-2">
          {msg}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedDelegates.map((d) => {
          const scoreMap = liveByProfile[d.userId] ?? {};
          const rowComplete = isRubricScoresComplete(scoreMap, keys);
          const rowTotal = rubricNumericTotalForKeys(scoreMap, keys);
          return (
            <button
              key={d.userId}
              type="button"
              onClick={() => setActiveUserId(d.userId)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors",
                "hover:border-[#007AFF]/45 hover:bg-[#F5F5F7]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/50",
                rowComplete
                  ? "border-emerald-400/35 bg-emerald-50/40"
                  : "border-[#D1D1D6] bg-[#FBFBFD]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xl leading-none" aria-hidden>
                  {flagEmojiForCountryName(d.country)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[0.65rem] tabular-nums",
                    rowComplete
                      ? "bg-emerald-500/15 text-emerald-900"
                      : "bg-amber-500/15 text-amber-950"
                  )}
                >
                  {rowComplete ? `${rowTotal}/${maxPts}` : t("unscoredBadge")}
                </span>
              </div>
              <p className="mt-2 font-sans text-sm font-semibold text-[#1D1D1F]">{d.country}</p>
              <p className="truncate text-xs text-[#6E6E73]">{d.displayName}</p>
              <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-wide text-[#6E6E73]">
                {rowComplete ? t("complete") : t("incomplete")}
              </p>
            </button>
          );
        })}
      </div>

      {modal}
    </section>
  );
}
