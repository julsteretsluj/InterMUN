"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

type DelegateRow = {
  userId: string;
  country: string;
  displayName: string;
};

type Props = {
  committeeConferenceId: string;
  delegates: DelegateRow[];
  scoresByProfileId: Record<string, Record<string, number>>;
};

export function DelegateMatrixPanel({ committeeConferenceId, delegates, scoresByProfileId }: Props) {
  const router = useRouter();
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

  useEffect(() => {
    setLiveByProfile({ ...scoresByProfileId });
  }, [scoresByProfileId]);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(saveTimersRef.current)) {
        window.clearTimeout(saveTimersRef.current[id]);
      }
      for (const id of Object.keys(saveStateTimersRef.current)) {
        window.clearTimeout(saveStateTimersRef.current[id]);
      }
    };
  }, []);

  const saveScores = useCallback(
    (profileId: string, scoreMap: Record<string, number>) => {
      if (!isRubricScoresComplete(scoreMap, keys)) return;
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
        setSavingByProfile((prev) => ({ ...prev, [profileId]: false }));
        if (res.error) {
          setMsg(res.error);
          setSaveStateByProfile((prev) => ({ ...prev, [profileId]: "error" }));
          return;
        }
        dirtyProfilesRef.current.delete(profileId);
        const delegate = delegates.find((d) => d.userId === profileId);
        setMsg(`Autosaved — ${delegate?.country ?? "delegate"}`);
        setSaveStateByProfile((prev) => ({ ...prev, [profileId]: "saved" }));
        if (saveStateTimersRef.current[profileId]) {
          window.clearTimeout(saveStateTimersRef.current[profileId]);
        }
        saveStateTimersRef.current[profileId] = window.setTimeout(() => {
          setSaveStateByProfile((prev) => ({ ...prev, [profileId]: null }));
        }, 2200);
        router.refresh();
      });
    },
    [committeeConferenceId, delegates, keys, router, startTransition]
  );

  const handleScore = useCallback((profileId: string, key: string, score: number | null) => {
    setLiveByProfile((prev) => {
      const row = { ...(prev[profileId] ?? {}) };
      if (score == null || score < 1) delete row[key];
      else row[key] = score;
      const next = { ...prev, [profileId]: row };
      dirtyProfilesRef.current.add(profileId);
      const existingTimer = saveTimersRef.current[profileId];
      if (existingTimer) window.clearTimeout(existingTimer);
      saveTimersRef.current[profileId] = window.setTimeout(() => {
        const latest = next[profileId] ?? {};
        if (!dirtyProfilesRef.current.has(profileId)) return;
        saveScores(profileId, latest);
      }, 900);
      return next;
    });
  }, [saveScores]);

  const completeCount = delegates.filter((d) =>
    isRubricScoresComplete(liveByProfile[d.userId] ?? null, keys)
  ).length;

  return (
    <section className="rounded-xl border border-brand-navy/12 bg-brand-paper p-4 md:p-5 space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
          Every delegate — session rubric (required)
        </h3>
        <p className="mt-1 text-xs text-brand-muted leading-relaxed">
          Same six dimensions as committee Best Delegate nominations. You must score <strong>every seated delegate</strong>{" "}
          before submitting nominations to SMT ({completeCount}/{delegates.length} complete).
        </p>
      </div>

      {msg ? (
        <p className="text-xs text-brand-navy dark:text-zinc-200 bg-brand-accent/10 border border-brand-accent/25 rounded-lg px-3 py-2">
          {msg}
        </p>
      ) : null}

      <div className="space-y-4">
        {delegates.map((d) => {
          const scoreMap = liveByProfile[d.userId] ?? {};
          const rowComplete = isRubricScoresComplete(scoreMap, keys);
          const total = rubricNumericTotalForKeys(scoreMap, keys);
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
                    {total}/{maxPts}
                  </span>
                  <span className="text-brand-muted">{rowComplete ? "Complete" : "Incomplete"}</span>
                </span>
              </summary>
              <div className="border-t border-brand-navy/10 px-4 pb-4 pt-3 space-y-3 dark:border-white/10">
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
                        disabled={pending || Boolean(savingByProfile[d.userId])}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={pending || Boolean(savingByProfile[d.userId])}
                    className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {savingByProfile[d.userId] ? "Saving…" : "Save this delegate"}
                  </button>
                  {saveStateByProfile[d.userId] === "saved" ? (
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">Autosaved</span>
                  ) : null}
                  {saveStateByProfile[d.userId] === "error" ? (
                    <span className="text-xs text-rose-700 dark:text-rose-300">Autosave failed</span>
                  ) : null}
                </form>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
