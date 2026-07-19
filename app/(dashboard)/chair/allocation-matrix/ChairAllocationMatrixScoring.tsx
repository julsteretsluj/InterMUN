"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { saveAwardParticipationScore } from "@/app/actions/award-participation";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import { DelegateFloorActivitySection } from "@/app/(dashboard)/chair/awards/DelegateFloorActivitySection";
import {
  isRubricScoresComplete,
  maxPointsForParticipationScope,
  rubricKeysForParticipationScope,
  rubricNumericTotalForKeys,
} from "@/lib/award-participation-scoring";
import { DELEGATE_CRITERIA } from "@/lib/seamuns-award-scoring";
import type { DelegateFloorActivity } from "@/lib/delegate-floor-activity";
import { cn } from "@/lib/utils";

export type AllocationScorableDelegate = {
  userId: string;
  country: string;
  displayName: string;
};

type ScoringContextValue = {
  scoringEnabled: boolean;
  activeUserId: string | null;
  openScoring: (userId: string) => void;
  isCompleteFor: (userId: string) => boolean;
};

const ScoringContext = createContext<ScoringContextValue | null>(null);

function useScoringContext() {
  const ctx = useContext(ScoringContext);
  if (!ctx) throw new Error("ChairAllocationMatrixScoring components must be used within Root");
  return ctx;
}

/** Pause allocation-matrix auto-refresh while a delegate scoring panel is open. */
export function useAllocationScoringPause(): boolean {
  const ctx = useContext(ScoringContext);
  return ctx?.activeUserId != null;
}

type RootProps = {
  committeeConferenceId: string;
  delegates: AllocationScorableDelegate[];
  scoresByProfileId: Record<string, Record<string, number>>;
  floorActivityByProfileId?: Record<string, DelegateFloorActivity>;
  scoringEnabled: boolean;
  children: ReactNode;
};

export function ChairAllocationScoringRoot({
  committeeConferenceId,
  delegates,
  scoresByProfileId,
  floorActivityByProfileId = {},
  scoringEnabled,
  children,
}: RootProps) {
  const keys = useMemo(() => rubricKeysForParticipationScope("delegate_by_chair"), []);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [liveByProfile, setLiveByProfile] = useState<Record<string, Record<string, number>>>(() => ({
    ...scoresByProfileId,
  }));
  const dirtyProfilesRef = useRef<Set<string>>(new Set());

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

  const isCompleteFor = useCallback(
    (userId: string) => isRubricScoresComplete(liveByProfile[userId] ?? null, keys),
    [liveByProfile, keys]
  );

  const openScoring = useCallback((userId: string) => {
    setActiveUserId(userId);
  }, []);

  const ctx = useMemo(
    () => ({ scoringEnabled, activeUserId, openScoring, isCompleteFor }),
    [scoringEnabled, activeUserId, openScoring, isCompleteFor]
  );

  return (
    <ScoringContext.Provider value={ctx}>
      {children}
      {scoringEnabled && activeUserId ? (
        <ChairAllocationScoringPanel
          committeeConferenceId={committeeConferenceId}
          delegates={delegates}
          activeUserId={activeUserId}
          onActiveUserIdChange={setActiveUserId}
          liveByProfile={liveByProfile}
          setLiveByProfile={setLiveByProfile}
          dirtyProfilesRef={dirtyProfilesRef}
          floorActivityByProfileId={floorActivityByProfileId}
          keys={keys}
        />
      ) : null}
    </ScoringContext.Provider>
  );
}

export function ChairAllocationScoreButton({ userId }: { userId: string }) {
  const t = useTranslations("chairAllocationMatrixPage");
  const { scoringEnabled, openScoring, isCompleteFor, activeUserId } = useScoringContext();

  if (!scoringEnabled) return null;

  const complete = isCompleteFor(userId);
  const isActive = activeUserId === userId;

  return (
    <button
      type="button"
      onClick={() => openScoring(userId)}
      aria-pressed={isActive}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
        isActive
          ? "bg-brand-accent text-white"
          : complete
            ? "border border-emerald-400/40 bg-emerald-50/80 text-emerald-900 hover:border-brand-accent/40 dark:bg-emerald-950/30 dark:text-emerald-100"
            : "border border-brand-navy/15 bg-brand-paper text-brand-navy hover:border-brand-accent/40"
      )}
    >
      {complete ? t("editScoreButton") : t("scoreButton")}
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          complete ? "bg-emerald-500" : "bg-amber-400"
        )}
        aria-hidden
      />
    </button>
  );
}

type PanelProps = {
  committeeConferenceId: string;
  delegates: AllocationScorableDelegate[];
  activeUserId: string;
  onActiveUserIdChange: (userId: string | null) => void;
  liveByProfile: Record<string, Record<string, number>>;
  setLiveByProfile: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
  dirtyProfilesRef: React.MutableRefObject<Set<string>>;
  floorActivityByProfileId: Record<string, DelegateFloorActivity>;
  keys: string[];
};

function ChairAllocationScoringPanel({
  committeeConferenceId,
  delegates,
  activeUserId,
  onActiveUserIdChange,
  liveByProfile,
  setLiveByProfile,
  dirtyProfilesRef,
  floorActivityByProfileId,
  keys,
}: PanelProps) {
  const t = useTranslations("chairAllocationMatrixPage");
  const tMatrix = useTranslations("chairAwardsDelegateMatrix");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const prevActiveUserIdRef = useRef<string | null>(null);

  const maxPts = maxPointsForParticipationScope("delegate_by_chair");
  const orderedDelegates = useMemo(
    () => [...delegates].sort((a, b) => a.country.localeCompare(b.country)),
    [delegates]
  );
  const activeIndex = orderedDelegates.findIndex((d) => d.userId === activeUserId);
  const activeDelegate = activeIndex >= 0 ? orderedDelegates[activeIndex] : null;
  const scoreMap = activeDelegate ? (liveByProfile[activeDelegate.userId] ?? {}) : {};
  const rowComplete = activeDelegate ? isRubricScoresComplete(scoreMap, keys) : false;
  const rowTotal = rubricNumericTotalForKeys(scoreMap, keys);

  useEffect(() => {
    if (prevActiveUserIdRef.current === activeUserId) return;
    prevActiveUserIdRef.current = activeUserId;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeUserId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveScores = useCallback(
    (profileId: string, scores: Record<string, number>) => {
      if (!isRubricScoresComplete(scores, keys)) return;
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      setSaveState("saving");
      setMsg(null);
      startTransition(async () => {
        const fd = new FormData();
        fd.set("scope", "delegate_by_chair");
        fd.set("committee_conference_id", committeeConferenceId);
        fd.set("subject_profile_id", profileId);
        for (const key of keys) {
          fd.set(`score_${key}`, String(scores[key]));
        }
        const res = await saveAwardParticipationScore(fd);
        saveInFlightRef.current = false;
        if (res.error) {
          setMsg(res.error);
          setSaveState("error");
          return;
        }
        dirtyProfilesRef.current.delete(profileId);
        setSaveState("saved");
        window.setTimeout(() => setSaveState(null), 2200);
      });
    },
    [committeeConferenceId, dirtyProfilesRef, keys, startTransition]
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

        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
          if (!dirtyProfilesRef.current.has(profileId)) return;
          const latest = next[profileId] ?? {};
          if (!isRubricScoresComplete(latest, keys)) return;
          saveScores(profileId, latest);
        }, 900);

        return next;
      });
    },
    [dirtyProfilesRef, keys, saveScores, setLiveByProfile]
  );

  const goToIndex = useCallback(
    (index: number) => {
      const target = orderedDelegates[index];
      if (!target) return;
      if (activeDelegate && dirtyProfilesRef.current.has(activeDelegate.userId)) {
        const currentScores = liveByProfile[activeDelegate.userId] ?? {};
        if (isRubricScoresComplete(currentScores, keys)) {
          saveScores(activeDelegate.userId, currentScores);
        }
      }
      onActiveUserIdChange(target.userId);
    },
    [activeDelegate, dirtyProfilesRef, keys, liveByProfile, onActiveUserIdChange, orderedDelegates, saveScores]
  );

  if (!activeDelegate) return null;

  return (
    <section
      ref={panelRef}
      id="allocation-matrix-scoring"
      className="mt-6 rounded-xl border border-brand-accent/35 bg-logo-cyan/10 p-4 md:p-6 space-y-4"
    >
      <div className="rounded-xl border border-amber-400/35 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <p className="font-semibold">{t("scoringDraftTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed">{t("scoringDraftNotice")}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
            {t("scoringPanelTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-brand-muted">
            {t("scoringPanelProgress", {
              current: activeIndex + 1,
              total: orderedDelegates.length,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onActiveUserIdChange(null)}
          className="rounded-lg border border-brand-navy/15 px-3 py-1.5 text-xs font-medium text-brand-muted hover:text-brand-navy"
        >
          {t("closeScoring")}
        </button>
      </div>

      <div className="rounded-xl border border-brand-accent/30 bg-brand-paper p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">
            {activeDelegate.country} — {activeDelegate.displayName}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
              rowComplete
                ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
            )}
          >
            {rowTotal}/{maxPts} · {rowComplete ? t("scoreStatusComplete") : t("scoreStatusIncomplete")}
          </span>
        </div>

        <DelegateFloorActivitySection activity={floorActivityByProfileId[activeDelegate.userId]} />

        <div className="grid gap-3">
          {DELEGATE_CRITERIA.map((criterion) => (
            <RubricCriterionPicker
              key={`${activeDelegate.userId}-${criterion.key}`}
              criterion={criterion}
              initialScore={Number(scoreMap[criterion.key] ?? 0)}
              onScoreChange={(key, score) => handleScore(activeDelegate.userId, key, score)}
              disabled={false}
            />
          ))}
        </div>

        {saveState === "saved" ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">{tMatrix("autosaved")}</p>
        ) : saveState === "error" && msg ? (
          <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">
            {msg}
          </p>
        ) : !rowComplete ? (
          <p className="text-xs text-brand-muted">{tMatrix("currentIncomplete")}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToIndex(activeIndex - 1)}
          disabled={activeIndex <= 0}
          aria-label={t("previousDelegate")}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
        >
          <span aria-hidden>←</span>
          {t("previousDelegate")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (rowComplete) saveScores(activeDelegate.userId, scoreMap);
          }}
          disabled={!rowComplete || saveState === "saving" || pending}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saveState === "saving" ? tMatrix("saving") : t("saveScore")}
        </button>
        <button
          type="button"
          onClick={() => goToIndex(activeIndex + 1)}
          disabled={activeIndex >= orderedDelegates.length - 1}
          aria-label={t("nextDelegate")}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
        >
          {t("nextDelegate")}
          <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}
