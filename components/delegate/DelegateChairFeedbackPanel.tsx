"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RubricCriterionPicker } from "@/app/(dashboard)/chair/awards/RubricCriterionPicker";
import { saveAwardParticipationScore } from "@/app/actions/award-participation";
import {
  rubricKeysForParticipationScope,
  maxPointsForParticipationScope,
  isRubricScoresComplete,
  rubricNumericTotalForKeys,
  type ChairSeat,
} from "@/lib/award-participation-scoring";
import { CHAIR_PERFORMANCE_RUBRIC } from "@/lib/seamun-awards-rubric-guide";
import type { AwardParticipationScore } from "@/types/database";
import { cn } from "@/lib/utils";

function scoreMapForChair(
  rows: AwardParticipationScore[],
  committeeId: string,
  chairId: string
): Record<string, number> {
  const row = rows.find(
    (r) =>
      r.scope === "chair_by_delegate" &&
      r.committee_conference_id === committeeId &&
      r.subject_profile_id === chairId
  );
  return (row?.rubric_scores ?? {}) as Record<string, number>;
}

export function DelegateChairFeedbackPanel({
  chairSeats,
  myScores,
}: {
  chairSeats: ChairSeat[];
  myScores: AwardParticipationScore[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const keys = useMemo(() => rubricKeysForParticipationScope("chair_by_delegate"), []);
  const maxPts = maxPointsForParticipationScope("chair_by_delegate");

  function submitForm(fd: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveAwardParticipationScore(fd);
      if (res.error) setMsg(res.error);
      else {
        setMsg("Saved.");
        router.refresh();
      }
    });
  }

  if (chairSeats.length === 0) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        No chair seats found for your active committee. Confirm your committee code / allocation.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-navy/12 bg-logo-cyan/10 p-4 md:p-5 space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">Chair feedback</h2>
        <p className="text-xs text-brand-muted leading-relaxed">
          Rate each chair using the official chair performance rubric (same criteria as secretariat oversight). Responses
          are aggregated for SMT; dais members do not see individual scores.
        </p>
        {msg ? <p className="text-xs text-brand-navy dark:text-zinc-200">{msg}</p> : null}
      </section>

      <section className="space-y-4">
        {chairSeats.map((seat) => {
          const pk = `${seat.committee_conference_id}:${seat.chair_profile_id}`;
          const scoreMap = scoreMapForChair(myScores, seat.committee_conference_id, seat.chair_profile_id);
          const complete = isRubricScoresComplete(scoreMap, keys);
          const total = rubricNumericTotalForKeys(scoreMap, keys);
          return (
            <details key={pk} className="rounded-xl border border-brand-navy/10 bg-brand-paper open:border-brand-accent/30">
              <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-brand-navy dark:text-zinc-100">
                  {seat.committeeLabel} — {seat.chairName}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
                    complete ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200" : "bg-amber-500/15"
                  )}
                >
                  {total}/{maxPts}
                </span>
              </summary>
              <div className="border-t border-brand-navy/10 px-4 pb-4 pt-3 dark:border-white/10">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("scope", "chair_by_delegate");
                    fd.set("committee_conference_id", seat.committee_conference_id);
                    fd.set("subject_profile_id", seat.chair_profile_id);
                    submitForm(fd);
                  }}
                >
                  <input type="hidden" name="scope" value="chair_by_delegate" />
                  <input type="hidden" name="committee_conference_id" value={seat.committee_conference_id} />
                  <input type="hidden" name="subject_profile_id" value={seat.chair_profile_id} />
                  <div className="grid gap-3">
                    {CHAIR_PERFORMANCE_RUBRIC.map((criterion) => (
                      <RubricCriterionPicker
                        key={`${pk}-${criterion.key}`}
                        criterion={criterion}
                        initialScore={Number(scoreMap[criterion.key] ?? 0)}
                        onScoreChange={() => {}}
                        disabled={pending}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Save feedback"}
                  </button>
                </form>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
