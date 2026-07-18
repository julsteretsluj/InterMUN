"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAwardParticipationScore } from "@/app/actions/award-participation";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import {
  rubricNumericTotalForKeys,
  rubricKeysForParticipationScope,
  maxPointsForParticipationScope,
  isRubricScoresComplete,
} from "@/lib/award-participation-scoring";
import { DELEGATE_CRITERIA } from "@/lib/seamuns-award-scoring";
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
  /** Open guided scoring first when the matrix is incomplete. */
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
  defaultGuided = false,
}: Props) {
  const t = useTranslations("chairAwardsDelegateMatrix");
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
  const autoAdvancedRef = useRef<string | null>(null);

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

  const initialIncomplete = delegates.some(
    (d) => !isRubricScoresComplete(scoresByProfileId[d.userId] ?? null, keys)
  );
  const [mode, setMode] = useState<"list" | "guided">(
    defaultGuided || initialIncomplete ? "guided" : "list"
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const ordered = [...delegates].sort((a, b) => {
      const aDone = isRubricScoresComplete(scoresByProfileId[a.userId] ?? null, keys);
      const bDone = isRubricScoresComplete(scoresByProfileId[b.userId] ?? null, keys);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return compareDelegates(a, b);
    });
    const firstIncomplete = ordered.findIndex(
      (d) => !isRubricScoresComplete(scoresByProfileId[d.userId] ?? null, keys)
    );
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [criterionIndex, setCriterionIndex] = useState(0);

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

  const saveInFlightRef = useRef<Set<string>>(new Set());

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

        const critIdx = DELEGATE_CRITERIA.findIndex((c) => c.key === key);
        if (
          mode === "guided" &&
          sortedDelegates[activeIndex]?.userId === profileId &&
          score != null &&
          score >= 1 &&
          critIdx === criterionIndex &&
          criterionIndex < DELEGATE_CRITERIA.length - 1
        ) {
          window.setTimeout(() => setCriterionIndex((i) => Math.min(i + 1, DELEGATE_CRITERIA.length - 1)), 180);
        }

        const existingTimer = saveTimersRef.current[profileId];
        if (existingTimer) window.clearTimeout(existingTimer);
        saveTimersRef.current[profileId] = window.setTimeout(() => {
          const latest = next[profileId] ?? {};
          if (!dirtyProfilesRef.current.has(profileId)) return;
          if (!isRubricScoresComplete(latest, keys)) return;
          saveScores(profileId, latest, () => {
            if (mode !== "guided") return;
            const active = sortedDelegates[activeIndex];
            if (!active || active.userId !== profileId) return;
            if (autoAdvancedRef.current === profileId) return;
            autoAdvancedRef.current = profileId;
            window.setTimeout(() => {
              autoAdvancedRef.current = null;
              const rotated = [
                ...sortedDelegates.slice(activeIndex + 1),
                ...sortedDelegates.slice(0, activeIndex + 1),
              ];
              const target = rotated.find((d) => !isRubricScoresComplete(next[d.userId] ?? null, keys));
              if (target) {
                const idx = sortedDelegates.findIndex((d) => d.userId === target.userId);
                if (idx >= 0) {
                  setActiveIndex(idx);
                  setCriterionIndex(0);
                }
              }
            }, 400);
          });
        }, 900);
        return next;
      });
    },
    [activeIndex, criterionIndex, keys, mode, saveScores, sortedDelegates]
  );

  const completeCount = sortedDelegates.filter((d) => isCompleteFor(d.userId)).length;
  const unscoredDelegates = sortedDelegates.filter((d) => !isCompleteFor(d.userId));

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

  const goTo = useCallback(
    (index: number) => {
      const current = sortedDelegates[activeIndex];
      if (current) flushSave(current.userId);
      setActiveIndex(Math.max(0, Math.min(sortedDelegates.length - 1, index)));
      setCriterionIndex(0);
    },
    [sortedDelegates, activeIndex, flushSave]
  );

  const goToNextUnscored = useCallback(() => {
    const current = sortedDelegates[activeIndex];
    if (current) flushSave(current.userId);
    const rotated = [
      ...sortedDelegates.slice(activeIndex + 1),
      ...sortedDelegates.slice(0, activeIndex + 1),
    ];
    const target = rotated.find((d) => !isCompleteFor(d.userId));
    if (target) {
      setActiveIndex(sortedDelegates.findIndex((d) => d.userId === target.userId));
      setCriterionIndex(0);
    }
  }, [sortedDelegates, activeIndex, flushSave, isCompleteFor]);

  const enterGuided = useCallback(() => {
    const firstIncomplete = sortedDelegates.findIndex((d) => !isCompleteFor(d.userId));
    setActiveIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setCriterionIndex(0);
    setMode("guided");
  }, [sortedDelegates, isCompleteFor]);

  const total = sortedDelegates.length;
  const activeDelegate = sortedDelegates[activeIndex];
  const hasUnscored = unscoredDelegates.length > 0;
  const activeCriterion = DELEGATE_CRITERIA[criterionIndex];

  if (delegates.length === 0) {
    return (
      <section
        id="delegate-matrix"
        className="rounded-xl border border-brand-navy/12 bg-brand-paper p-4 md:p-5 space-y-3"
      >
        <div>
          <h3 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
            {t("title")}
          </h3>
          <p className="mt-1 text-xs text-brand-muted leading-relaxed">{t("emptyBody")}</p>
        </div>
        <Link
          href="/chair/allocation-matrix"
          className="inline-flex rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white"
        >
          {t("emptyCta")}
        </Link>
      </section>
    );
  }

  return (
    <section
      id="delegate-matrix"
      className="rounded-xl border border-brand-navy/12 bg-brand-paper p-4 md:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
            {t("title")}
          </h3>
          <p className="mt-1 text-xs text-brand-muted leading-relaxed">
            {t.rich("intro", {
              strong: (chunks) => <strong>{chunks}</strong>,
              completeCount,
              total: sortedDelegates.length,
            })}
          </p>
        </div>
        <div
          className="inline-flex shrink-0 rounded-lg border border-brand-navy/15 bg-brand-navy/5 p-1 text-sm font-semibold"
          role="tablist"
          aria-label={t("modeSwitchLabel")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "list"}
            onClick={() => setMode("list")}
            className={cn(
              "rounded-md px-4 py-2 transition-colors",
              mode === "list" ? "bg-brand-paper text-brand-navy shadow-sm" : "text-brand-muted hover:text-brand-navy"
            )}
          >
            {t("modeList")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "guided"}
            onClick={enterGuided}
            className={cn(
              "rounded-md px-4 py-2 transition-colors",
              mode === "guided" ? "bg-brand-paper text-brand-navy shadow-sm" : "text-brand-muted hover:text-brand-navy"
            )}
          >
            {t("modeGuided")}
          </button>
        </div>
      </div>

      {hasUnscored ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20 space-y-2">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{t("unscoredBannerTitle")}</p>
          <p className="text-xs text-amber-900/90 dark:text-amber-100/85">{t("unscoredBannerBody")}</p>
          <p className="text-xs font-medium text-amber-950 dark:text-amber-100">{t("unscoredListLabel")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {unscoredDelegates.map((d) => (
              <li key={d.userId}>
                <button
                  type="button"
                  onClick={() => {
                    enterGuided();
                    goTo(sortedDelegates.findIndex((x) => x.userId === d.userId));
                  }}
                  className="rounded-full border border-amber-500/40 bg-white/70 px-2.5 py-0.5 text-xs font-medium text-amber-950 hover:border-brand-accent/50 dark:bg-black/20 dark:text-amber-100"
                >
                  {d.country}
                </button>
              </li>
            ))}
          </ul>
          {mode !== "guided" ? (
            <button
              type="button"
              onClick={enterGuided}
              className="mt-1 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white"
            >
              {t("startGuidedCta")}
            </button>
          ) : null}
        </div>
      ) : null}

      {msg ? (
        <p className="text-xs text-brand-navy dark:text-zinc-200 bg-brand-accent/10 border border-brand-accent/25 rounded-lg px-3 py-2">
          {msg}
        </p>
      ) : null}

      {mode === "guided" ? (
        activeDelegate && activeCriterion ? (
          <div className="space-y-4">
            <p className="text-xs text-brand-muted">{t("guidedHint")}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-brand-muted">
                <span className="font-medium text-brand-navy dark:text-zinc-100">
                  {t("guidedProgress", { current: activeIndex + 1, total })}
                </span>
                <span>{t("guidedComplete", { completeCount, total })}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-navy/10">
                <div
                  className="h-full rounded-full bg-brand-accent transition-[width] duration-300"
                  style={{ width: `${total ? (completeCount / total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sortedDelegates.map((d, i) => (
                  <button
                    key={d.userId}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`${d.country} — ${d.displayName}`}
                    aria-current={i === activeIndex}
                    title={`${d.country} — ${d.displayName}`}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border transition-colors",
                      i === activeIndex ? "ring-2 ring-brand-accent/60 ring-offset-1 ring-offset-brand-paper" : "",
                      isCompleteFor(d.userId)
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-brand-navy/30 bg-transparent"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-brand-accent/30 bg-logo-cyan/8 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">
                  {activeDelegate.country} — {activeDelegate.displayName}
                </h4>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
                    isCompleteFor(activeDelegate.userId)
                      ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                      : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  )}
                >
                  {rubricNumericTotalForKeys(liveByProfile[activeDelegate.userId] ?? {}, keys)}/{maxPts}
                </span>
              </div>
              <DelegateFloorActivitySection activity={floorActivityByProfileId[activeDelegate.userId]} />

              <div className="flex items-center justify-between gap-2 text-xs text-brand-muted">
                <span className="font-medium text-brand-navy dark:text-zinc-100">
                  {t("criterionProgress", {
                    current: criterionIndex + 1,
                    total: DELEGATE_CRITERIA.length,
                  })}
                </span>
                <span>{t("guidedAutoAdvanceNote")}</span>
              </div>

              <div className="grid gap-3" key={`${activeDelegate.userId}-${activeCriterion.key}`}>
                <RubricCriterionPicker
                  criterion={activeCriterion}
                  initialScore={Number((liveByProfile[activeDelegate.userId] ?? {})[activeCriterion.key] ?? 0)}
                  onScoreChange={(key, score) => handleScore(activeDelegate.userId, key, score)}
                  disabled={false}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCriterionIndex((i) => Math.max(0, i - 1))}
                  disabled={criterionIndex === 0}
                  className="rounded-lg border border-brand-navy/20 px-3 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-40"
                >
                  {t("prevCriterion")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCriterionIndex((i) => Math.min(DELEGATE_CRITERIA.length - 1, i + 1))
                  }
                  disabled={criterionIndex >= DELEGATE_CRITERIA.length - 1}
                  className="rounded-lg border border-brand-navy/20 px-3 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-40"
                >
                  {t("nextCriterion")}
                </button>
              </div>

              {saveStateByProfile[activeDelegate.userId] === "saved" ? (
                <span className="text-xs text-emerald-700 dark:text-emerald-300">{t("autosaved")}</span>
              ) : saveStateByProfile[activeDelegate.userId] === "error" ? (
                <span className="text-xs text-rose-700 dark:text-rose-300">{t("autosaveFailed")}</span>
              ) : !isCompleteFor(activeDelegate.userId) ? (
                <p className="text-xs text-brand-muted">{t("currentIncomplete")}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
              >
                {t("previous")}
              </button>
              <div className="flex flex-wrap gap-2">
                {hasUnscored ? (
                  <button
                    type="button"
                    onClick={goToNextUnscored}
                    className="rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy hover:border-brand-accent/50"
                  >
                    {t("nextUnscored")}
                  </button>
                ) : null}
                {activeIndex < total - 1 ? (
                  <button
                    type="button"
                    onClick={() => goTo(activeIndex + 1)}
                    className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t("saveAndNext")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => flushSave(activeDelegate.userId)}
                    className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t("finish")}
                  </button>
                )}
              </div>
            </div>

            {completeCount === total ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">
                <p className="font-semibold">{t("allScoredTitle")}</p>
                <p className="mt-0.5 text-xs">{t("allScoredBody")}</p>
              </div>
            ) : null}
          </div>
        ) : null
      ) : (
        <div className="space-y-4">
          {sortedDelegates.map((d) => {
            const scoreMap = liveByProfile[d.userId] ?? {};
            const rowComplete = isRubricScoresComplete(scoreMap, keys);
            const rowTotal = rubricNumericTotalForKeys(scoreMap, keys);
            return (
              <details
                key={d.userId}
                className="group rounded-xl border border-brand-navy/10 bg-logo-cyan/8 open:border-brand-accent/35"
              >
                <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-brand-navy dark:text-zinc-100">
                    {d.country} — {d.displayName}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono tabular-nums",
                        rowComplete
                          ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                          : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                      )}
                    >
                      {rowTotal}/{maxPts}
                    </span>
                    <span className="text-brand-muted">{rowComplete ? t("complete") : t("incomplete")}</span>
                  </span>
                </summary>
                <div className="border-t border-brand-navy/10 px-4 pb-4 pt-3 space-y-3 dark:border-white/10">
                  <DelegateFloorActivitySection activity={floorActivityByProfileId[d.userId]} />
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveScores(d.userId, scoreMap);
                    }}
                  >
                    <input type="hidden" name="scope" value="delegate_by_chair" />
                    <input type="hidden" name="committee_conference_id" value={committeeConferenceId} />
                    <input type="hidden" name="subject_profile_id" value={d.userId} />
                    <div className="grid gap-3">
                      {DELEGATE_CRITERIA.map((criterion) => (
                        <RubricCriterionPicker
                          key={`${d.userId}-${criterion.key}`}
                          criterion={criterion}
                          initialScore={Number(scoreMap[criterion.key] ?? 0)}
                          onScoreChange={(key, score) => handleScore(d.userId, key, score)}
                          disabled={false}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={pending || Boolean(savingByProfile[d.userId])}
                      className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {savingByProfile[d.userId] ? t("saving") : t("saveThisDelegate")}
                    </button>
                    {saveStateByProfile[d.userId] === "saved" ? (
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">{t("autosaved")}</span>
                    ) : null}
                    {saveStateByProfile[d.userId] === "error" ? (
                      <span className="text-xs text-rose-700 dark:text-rose-300">{t("autosaveFailed")}</span>
                    ) : null}
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
