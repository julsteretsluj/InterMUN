import type { NominationRubricType } from "@/lib/seamuns-award-scoring";

/** One recipient per committee for these chair submission types. */
export const SINGLE_WINNER_NOMINATION_TYPES: readonly NominationRubricType[] = [
  "committee_best_delegate",
  "committee_best_position_paper",
  "conference_best_delegate",
] as const;

export function isSingleWinnerNominationType(t: NominationRubricType): boolean {
  return (SINGLE_WINNER_NOMINATION_TYPES as readonly string[]).includes(t);
}

export function nominationGroupKey(committeeConferenceId: string, nominationType: string): string {
  return `${committeeConferenceId}\x1f${nominationType}`;
}

/**
 * For each committee + award type, only the lowest pending rank is shown to SMT.
 * When that row is approved or rejected, the next rank becomes the new minimum.
 * For single-winner types, if any nomination in the group is already selected, no pending rows are shown
 * (remaining ranks were superseded on promotion).
 */
export function filterNominationsForSmtQueue<
  T extends { committee_conference_id: string; nomination_type: NominationRubricType; rank: number },
>(pending: T[], selectedSingleWinnerGroupKeys: ReadonlySet<string>): T[] {
  const groups = new Map<string, T[]>();
  for (const n of pending) {
    const key = nominationGroupKey(n.committee_conference_id, n.nomination_type);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  const out: T[] = [];
  for (const [key, rows] of groups) {
    const nominationType = rows[0]!.nomination_type;
    if (isSingleWinnerNominationType(nominationType) && selectedSingleWinnerGroupKeys.has(key)) {
      continue;
    }
    const minRank = Math.min(...rows.map((r) => r.rank));
    for (const r of rows) {
      if (r.rank === minRank) out.push(r);
    }
  }

  out.sort((a, b) => {
    const c = a.committee_conference_id.localeCompare(b.committee_conference_id);
    if (c !== 0) return c;
    const t = a.nomination_type.localeCompare(b.nomination_type);
    if (t !== 0) return t;
    return a.rank - b.rank;
  });
  return out;
}
