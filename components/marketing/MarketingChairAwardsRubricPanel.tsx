// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import {
  isRubricScoresComplete,
  maxPointsForParticipationScope,
  rubricKeysForParticipationScope,
  rubricNumericTotalForKeys,
} from "@/lib/award-participation-scoring";
import { DELEGATE_CRITERIA } from "@/lib/seamuns-award-scoring";
import { cn } from "@/lib/utils";

type DelegateRow = {
  id: string;
  country: string;
  displayName: string;
};

const DELEGATE_SEED: DelegateRow[] = [
  { id: "kenya", country: "Kenya", displayName: "Amina O." },
  { id: "norway", country: "Norway", displayName: "Erik L." },
  { id: "mexico", country: "Mexico", displayName: "Sofia R." },
  { id: "philippines", country: "Philippines", displayName: "Miguel T." },
];

const INITIAL_SCORES: Record<string, Record<string, number>> = {
  norway: {
    creativity: 7,
    diplomacy: 8,
    collaboration: 7,
    leadership: 8,
    knowledge_research: 7,
    participation: 8,
  },
  kenya: {
    creativity: 6,
    diplomacy: 7,
  },
};

function compareDelegates(a: DelegateRow, b: DelegateRow): number {
  const byCountry = a.country.localeCompare(b.country);
  if (byCountry !== 0) return byCountry;
  return a.displayName.localeCompare(b.displayName);
}

export function MarketingChairAwardsRubricPanel({ className }: { className?: string }) {
  const t = useTranslations("chairAwardsDelegateMatrix");
  const keys = useMemo(() => rubricKeysForParticipationScope("delegate_by_chair"), []);
  const maxPts = maxPointsForParticipationScope("delegate_by_chair");

  const [liveByProfile, setLiveByProfile] = useState<Record<string, Record<string, number>>>(
    () => ({ ...INITIAL_SCORES })
  );
  const [mode, setMode] = useState<"list" | "guided">("guided");
  const [activeIndex, setActiveIndex] = useState(0);
  const [criterionIndex, setCriterionIndex] = useState(0);

  const isCompleteFor = useCallback(
    (profileId: string) => isRubricScoresComplete(liveByProfile[profileId] ?? null, keys),
    [liveByProfile, keys]
  );

  const sortedDelegates = useMemo(() => {
    return [...DELEGATE_SEED].sort((a, b) => {
      const aDone = isCompleteFor(a.id);
      const bDone = isCompleteFor(b.id);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return compareDelegates(a, b);
    });
  }, [isCompleteFor]);

  const completeCount = sortedDelegates.filter((d) => isCompleteFor(d.id)).length;
  const unscoredDelegates = sortedDelegates.filter((d) => !isCompleteFor(d.id));
  const hasUnscored = unscoredDelegates.length > 0;
  const total = sortedDelegates.length;
  const activeDelegate = sortedDelegates[activeIndex];
  const activeCriterion = DELEGATE_CRITERIA[criterionIndex];

  const handleScore = useCallback(
    (profileId: string, key: string, score: number | null) => {
      setLiveByProfile((prev) => {
        const row = { ...(prev[profileId] ?? {}) };
        if (score != null && score >= 1) row[key] = score;
        else delete row[key];
        return { ...prev, [profileId]: row };
      });
      if (
        sortedDelegates[activeIndex]?.id === profileId &&
        score != null &&
        score >= 1 &&
        DELEGATE_CRITERIA.findIndex((c) => c.key === key) === criterionIndex &&
        criterionIndex < DELEGATE_CRITERIA.length - 1
      ) {
        window.setTimeout(
          () => setCriterionIndex((i) => Math.min(i + 1, DELEGATE_CRITERIA.length - 1)),
          180
        );
      }
    },
    [activeIndex, criterionIndex, sortedDelegates]
  );

  const enterGuided = useCallback(() => {
    const firstIncomplete = sortedDelegates.findIndex((d) => !isCompleteFor(d.id));
    setActiveIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setCriterionIndex(0);
    setMode("guided");
  }, [sortedDelegates, isCompleteFor]);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(Math.max(0, Math.min(sortedDelegates.length - 1, index)));
      setCriterionIndex(0);
    },
    [sortedDelegates.length]
  );

  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--clicky-line)] bg-[var(--clicky-paper)] p-4 text-[var(--clicky-ink)] md:p-6",
        "space-y-4",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-lg font-semibold text-[var(--clicky-ink)]">{t("title")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--clicky-ink-soft)]">
            {t.rich("intro", {
              strong: (chunks) => <strong>{chunks}</strong>,
              completeCount,
              total: sortedDelegates.length,
            })}
          </p>
        </div>
        <div
          className="inline-flex shrink-0 rounded-lg border border-[var(--clicky-line)] bg-[var(--clicky-paper)] p-1 text-sm font-semibold"
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
              mode === "list" ? "bg-[var(--clicky-paper)] text-[var(--clicky-ink)] shadow-sm" : "text-[var(--clicky-ink-soft)] hover:text-[var(--clicky-ink)]"
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
              mode === "guided" ? "bg-[var(--clicky-paper)] text-[var(--clicky-ink)] shadow-sm" : "text-[var(--clicky-ink-soft)] hover:text-[var(--clicky-ink)]"
            )}
          >
            {t("modeGuided")}
          </button>
        </div>
      </div>

      {hasUnscored ? (
        <div className="space-y-2 rounded-xl border border-[color-mix(in_srgb,#febc2e_40%,var(--clicky-line))] bg-[color-mix(in_srgb,#febc2e_12%,white)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--clicky-ink)]">{t("unscoredBannerTitle")}</p>
          <p className="text-xs text-[var(--clicky-ink-soft)]">{t("unscoredBannerBody")}</p>
          <p className="text-xs font-medium text-[var(--clicky-ink)]">{t("unscoredListLabel")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {unscoredDelegates.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    enterGuided();
                    goTo(sortedDelegates.findIndex((x) => x.id === d.id));
                  }}
                  className="rounded-full border border-[color-mix(in_srgb,#febc2e_45%,var(--clicky-line))] bg-[color-mix(in_srgb,var(--clicky-window)_70%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--clicky-ink)] hover:border-[color-mix(in_srgb,var(--clicky-blue)_50%,var(--clicky-line))]"
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
              className="mt-1 rounded-lg bg-[var(--clicky-blue)] px-4 py-2 text-sm font-semibold text-white"
            >
              {t("startGuidedCta")}
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "guided" && activeDelegate && activeCriterion ? (
        <div className="space-y-4">
          <p className="text-xs text-[var(--clicky-ink-soft)]">{t("guidedHint")}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--clicky-ink-soft)]">
              <span className="font-medium text-[var(--clicky-ink)]">
                {t("guidedProgress", { current: activeIndex + 1, total })}
              </span>
              <span>{t("guidedComplete", { completeCount, total })}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--clicky-paper-deep)]">
              <div
                className="h-full rounded-full bg-[var(--clicky-blue)] transition-[width] duration-300"
                style={{ width: `${total ? (completeCount / total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sortedDelegates.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`${d.country} — ${d.displayName}`}
                  aria-current={i === activeIndex}
                  title={`${d.country} — ${d.displayName}`}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border transition-colors",
                    i === activeIndex ? "ring-2 ring-[color-mix(in_srgb,var(--clicky-blue)_60%,transparent)] ring-offset-1 ring-offset-white" : "",
                    isCompleteFor(d.id)
                      ? "border-[var(--clicky-mint)] bg-[var(--clicky-mint)]"
                      : "border-[var(--clicky-line)] bg-transparent"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--clicky-blue)_30%,var(--clicky-line))] bg-[color-mix(in_srgb,var(--clicky-blue)_8%,white)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-sans text-base font-semibold text-[var(--clicky-ink)]">
                {activeDelegate.country} — {activeDelegate.displayName}
              </h4>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
                  isCompleteFor(activeDelegate.id)
                    ? "bg-[color-mix(in_srgb,var(--clicky-mint)_15%,white)] text-[var(--clicky-ink)]"
                    : "bg-[color-mix(in_srgb,#febc2e_15%,white)] text-[var(--clicky-ink)]"
                )}
              >
                {rubricNumericTotalForKeys(liveByProfile[activeDelegate.id] ?? {}, keys)}/{maxPts}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-[var(--clicky-ink-soft)]">
              <span className="font-medium text-[var(--clicky-ink)]">
                {t("criterionProgress", {
                  current: criterionIndex + 1,
                  total: DELEGATE_CRITERIA.length,
                })}
              </span>
              <span>{t("guidedAutoAdvanceNote")}</span>
            </div>

            <RubricCriterionPicker
              key={`${activeDelegate.id}-${activeCriterion.key}`}
              criterion={activeCriterion}
              initialScore={Number((liveByProfile[activeDelegate.id] ?? {})[activeCriterion.key] ?? 0)}
              onScoreChange={(key, score) => handleScore(activeDelegate.id, key, score)}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCriterionIndex((i) => Math.max(0, i - 1))}
                disabled={criterionIndex === 0}
                className="rounded-lg border border-[var(--clicky-line)] px-3 py-1.5 text-xs font-medium text-[var(--clicky-ink)] disabled:opacity-40"
              >
                {t("prevCriterion")}
              </button>
              <button
                type="button"
                onClick={() => setCriterionIndex((i) => Math.min(DELEGATE_CRITERIA.length - 1, i + 1))}
                disabled={criterionIndex >= DELEGATE_CRITERIA.length - 1}
                className="rounded-lg border border-[var(--clicky-line)] px-3 py-1.5 text-xs font-medium text-[var(--clicky-ink)] disabled:opacity-40"
              >
                {t("nextCriterion")}
              </button>
            </div>

            {!isCompleteFor(activeDelegate.id) ? (
              <p className="text-xs text-[var(--clicky-ink-soft)]">{t("currentIncomplete")}</p>
            ) : (
              <span className="text-xs text-[var(--clicky-ink-soft)]">{t("autosaved")}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="rounded-lg border border-[var(--clicky-line)] px-3 py-2 text-sm font-medium text-[var(--clicky-ink)] disabled:opacity-40"
            >
              {t("previous")}
            </button>
            {activeIndex < total - 1 ? (
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="rounded-lg bg-[var(--clicky-blue)] px-4 py-2 text-sm font-semibold text-white"
              >
                {t("saveAndNext")}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg bg-[var(--clicky-blue)] px-4 py-2 text-sm font-semibold text-white"
              >
                {t("finish")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDelegates.map((d) => {
            const scoreMap = liveByProfile[d.id] ?? {};
            const rowComplete = isRubricScoresComplete(scoreMap, keys);
            const rowTotal = rubricNumericTotalForKeys(scoreMap, keys);
            return (
              <details
                key={d.id}
                className="group rounded-xl border border-[var(--clicky-line)] bg-[color-mix(in_srgb,var(--clicky-blue)_8%,white)] open:border-[color-mix(in_srgb,var(--clicky-blue)_35%,var(--clicky-line))]"
                open={d.id === "kenya"}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-[var(--clicky-ink)]">
                    {d.country} — {d.displayName}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono tabular-nums",
                        rowComplete
                          ? "bg-[color-mix(in_srgb,var(--clicky-mint)_15%,white)] text-[var(--clicky-ink)]"
                          : "bg-[color-mix(in_srgb,#febc2e_15%,white)] text-[var(--clicky-ink)]"
                      )}
                    >
                      {rowTotal}/{maxPts}
                    </span>
                    <span className="text-[var(--clicky-ink-soft)]">{rowComplete ? t("complete") : t("incomplete")}</span>
                  </span>
                </summary>
                <div className="space-y-3 border-t border-[var(--clicky-line)] px-4 pb-4 pt-3">
                  <div className="grid gap-3">
                    {DELEGATE_CRITERIA.map((criterion) => (
                      <RubricCriterionPicker
                        key={`${d.id}-${criterion.key}`}
                        criterion={criterion}
                        initialScore={Number(scoreMap[criterion.key] ?? 0)}
                        onScoreChange={(key, score) => handleScore(d.id, key, score)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="inline-flex rounded-lg bg-[var(--clicky-blue)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t("saveThisDelegate")}
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
