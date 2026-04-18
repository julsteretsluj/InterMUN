/**
 * Chair award nominations: draft → pending (SMT queue) via button or deadline.
 * Default deadline: end of conference day 17 Jan 2027 UTC (override with AWARD_SUBMISSION_DEADLINE_ISO).
 */
import type { NominationRubricType } from "@/lib/seamuns-award-scoring";
import { criteriaForNominationType } from "@/lib/seamuns-award-scoring";

export const AWARD_SUBMISSION_DEADLINE_ISO =
  process.env.AWARD_SUBMISSION_DEADLINE_ISO ?? "2027-01-17T23:59:59.000Z";

export function isPastAwardSubmissionDeadline(nowMs: number = Date.now()): boolean {
  const t = Date.parse(AWARD_SUBMISSION_DEADLINE_ISO);
  if (!Number.isFinite(t)) return false;
  return nowMs >= t;
}

type NomRow = {
  nomination_type: NominationRubricType;
  rank: number;
  nominee_profile_id: string | null;
  rubric_scores: Record<string, number> | null;
  status: string;
};

function isSlotComplete(
  typeId: NominationRubricType,
  rank: number,
  row: NomRow | undefined,
  criteriaKeys: string[]
): boolean {
  if (!row?.nominee_profile_id) return false;
  const scores = row.rubric_scores ?? {};
  return criteriaKeys.every((c) => Number(scores[c] ?? 0) >= 1);
}

export type ChairAwardSlotSpec = {
  nominationType: NominationRubricType;
  rank: number;
  required: boolean;
};

export function buildChairAwardSlotSpecs(seatedDelegatesCount: number): ChairAwardSlotSpec[] {
  const hmRequiresTwo = seatedDelegatesCount > 22;
  const specs: ChairAwardSlotSpec[] = [
    { nominationType: "committee_best_delegate", rank: 1, required: true },
    { nominationType: "committee_best_delegate", rank: 2, required: true },
    ...(hmRequiresTwo
      ? [
          { nominationType: "committee_honourable_mention" as const, rank: 1, required: true },
          { nominationType: "committee_honourable_mention" as const, rank: 2, required: true },
          { nominationType: "committee_honourable_mention" as const, rank: 3, required: false },
        ]
      : [
          { nominationType: "committee_honourable_mention" as const, rank: 1, required: true },
          { nominationType: "committee_honourable_mention" as const, rank: 2, required: false },
        ]),
    { nominationType: "committee_best_position_paper", rank: 1, required: true },
    { nominationType: "committee_best_position_paper", rank: 2, required: true },
    { nominationType: "conference_best_delegate", rank: 1, required: true },
  ];
  return specs;
}

export function evaluateChairAwardSubmissionReadiness(
  rows: NomRow[],
  seatedDelegatesCount: number
): { ok: boolean; missing: string[] } {
  const specs = buildChairAwardSlotSpecs(seatedDelegatesCount);
  const byKey = new Map(rows.map((r) => [`${r.nomination_type}:${r.rank}`, r] as const));
  const missing: string[] = [];

  for (const spec of specs) {
    if (!spec.required) continue;
    const row = byKey.get(`${spec.nominationType}:${spec.rank}`);
    const keys = criteriaForNominationType(spec.nominationType).map((c) => c.key);
    if (!isSlotComplete(spec.nominationType, spec.rank, row, keys)) {
      missing.push(`${spec.nominationType} rank ${spec.rank}`);
    }
  }

  return { ok: missing.length === 0, missing };
}
