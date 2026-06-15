import { rubricNumericTotal, type NominationRubricType } from "@/lib/seamuns-award-scoring";

export type OverallBestDelegateLadderRow = {
  id: string;
  nomination_type: NominationRubricType;
  nominee_profile_id: string;
  committee_conference_id: string;
  rubric_scores: Record<string, number> | null;
  evidence_note: string | null;
  rank: number;
  status: string;
};

export type LadderMatchup = {
  roundLabel: string;
  nomineeA: OverallBestDelegateLadderRow;
  nomineeB: OverallBestDelegateLadderRow | null;
};

const OVERALL_TYPE: NominationRubricType = "conference_best_delegate";

export function pendingOverallBestDelegates(
  rows: OverallBestDelegateLadderRow[]
): OverallBestDelegateLadderRow[] {
  return rows.filter((r) => r.nomination_type === OVERALL_TYPE && r.status === "pending");
}

export function seedOverallBestDelegates(
  pending: OverallBestDelegateLadderRow[]
): OverallBestDelegateLadderRow[] {
  return [...pending].sort((a, b) => {
    const tb = rubricNumericTotal(b.rubric_scores, OVERALL_TYPE);
    const ta = rubricNumericTotal(a.rubric_scores, OVERALL_TYPE);
    if (tb !== ta) return tb - ta;
    return a.committee_conference_id.localeCompare(b.committee_conference_id);
  });
}

/**
 * Pair highest seed vs lowest, second vs second-lowest, etc. Odd count → top seed bye.
 */
export function buildLadderMatchups(pending: OverallBestDelegateLadderRow[]): LadderMatchup[] {
  const seeded = seedOverallBestDelegates(pending);
  const n = seeded.length;
  if (n <= 1) return [];

  const roundLabel = n === 2 ? "Final" : n <= 4 ? "Semi-final" : `Round of ${n}`;

  const matchups: LadderMatchup[] = [];
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    matchups.push({
      roundLabel,
      nomineeA: seeded[lo]!,
      nomineeB: seeded[hi]!,
    });
    lo += 1;
    hi -= 1;
  }
  if (lo === hi) {
    matchups.push({
      roundLabel: `${roundLabel} (bye)`,
      nomineeA: seeded[lo]!,
      nomineeB: null,
    });
  }
  return matchups;
}

export function ladderChampion(
  pending: OverallBestDelegateLadderRow[]
): OverallBestDelegateLadderRow | null {
  if (pending.length !== 1) return null;
  return pending[0] ?? null;
}
