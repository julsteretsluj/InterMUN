"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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

  useEffect(() => {
    setLiveByProfile({ ...scoresByProfileId });
  }, [scoresByProfileId]);

  const handleScore = useCallback((profileId: string, key: string, score: number | null) => {
    setLiveByProfile((prev) => {
      const row = { ...(prev[profileId] ?? {}) };
      if (score == null || score < 1) delete row[key];
      else row[key] = score;
      return { ...prev, [profileId]: row };
    });
  }, []);

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
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    fd.set("scope", "delegate_by_chair");
                    fd.set("committee_conference_id", committeeConferenceId);
                    fd.set("subject_profile_id", d.userId);
                    setMsg(null);
                    startTransition(async () => {
                      const res = await saveAwardParticipationScore(fd);
                      if (res.error) setMsg(res.error);
                      else {
                        setMsg(`Saved — ${d.country}`);
                        router.refresh();
                      }
                    });
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
                        disabled={pending}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Save this delegate"}
                  </button>
                </form>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
