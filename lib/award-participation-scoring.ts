import { rubricKeysForAwardAssignmentCategory } from "@/lib/award-category-rubric";
import { CHAIR_PERFORMANCE_RUBRIC } from "@/lib/seamun-awards-rubric-guide";
import { RUBRIC_KEYS_BY_NOMINATION } from "@/lib/seamuns-award-scoring";

export const PARTICIPATION_SCOPES = [
  "delegate_by_chair",
  "chair_by_smt",
  "chair_report_by_smt",
  "chair_by_delegate",
] as const;
export type ParticipationScope = (typeof PARTICIPATION_SCOPES)[number];

export function rubricKeysForParticipationScope(scope: ParticipationScope): string[] {
  switch (scope) {
    case "delegate_by_chair":
      return [...RUBRIC_KEYS_BY_NOMINATION.committee_best_delegate];
    case "chair_by_smt":
    case "chair_by_delegate":
      return CHAIR_PERFORMANCE_RUBRIC.map((c) => c.key);
    case "chair_report_by_smt":
      return rubricKeysForAwardAssignmentCategory("best_chair_report");
    default:
      return [];
  }
}

export function maxPointsForParticipationScope(scope: ParticipationScope): number {
  return rubricKeysForParticipationScope(scope).length * 8;
}

export function isRubricScoresComplete(scores: Record<string, unknown> | null | undefined, keys: string[]): boolean {
  if (!scores || typeof scores !== "object") return false;
  return keys.every((k) => {
    const v = Number((scores as Record<string, number>)[k] ?? 0);
    return Number.isInteger(v) && v >= 1 && v <= 8;
  });
}

export function rubricNumericTotalForKeys(
  scores: Record<string, number> | null | undefined,
  keys: string[]
): number {
  if (!scores) return 0;
  return keys.reduce((s, k) => s + Number(scores[k] ?? 0), 0);
}

/** Chairs must score every seated delegate (non-chair) before submitting nominations to SMT. */
export function evaluateDelegateMatrixReadiness(
  delegateProfileIds: string[],
  rows: { subject_profile_id: string | null; rubric_scores: Record<string, number> | null }[]
): { ok: boolean; missing: string[] } {
  const keys = rubricKeysForParticipationScope("delegate_by_chair");
  const bySubject = new Map(rows.filter((r) => r.subject_profile_id).map((r) => [r.subject_profile_id!, r]));
  const missing: string[] = [];
  for (const id of delegateProfileIds) {
    const row = bySubject.get(id);
    if (!isRubricScoresComplete(row?.rubric_scores ?? null, keys)) {
      missing.push(id.slice(0, 8));
    }
  }
  return { ok: missing.length === 0, missing };
}

export type ChairSeat = {
  committee_conference_id: string;
  chair_profile_id: string;
  committeeLabel: string;
  chairName: string;
};

/** Mean rubric totals from delegate evaluations (same keys as chair_by_smt). */
export type DelegateChairFeedbackAggregate = {
  committee_conference_id: string;
  chair_profile_id: string;
  responseCount: number;
  avgTotal: number;
};

/** Chair report scores attach to one conference row per committee; topic-level ids merge onto canonical (latest wins). */
export function mergeChairReportScoresToCanonical<
  T extends {
    scope: string;
    committee_conference_id: string;
    rubric_scores: Record<string, number> | null;
    updated_at: string;
  },
>(rows: T[], conferenceIdToCanonical: Map<string, string>): T[] {
  const rest = rows.filter((r) => r.scope !== "chair_report_by_smt");
  const reportRows = rows.filter((r) => r.scope === "chair_report_by_smt");
  const byCanon = new Map<string, T>();
  for (const r of reportRows) {
    const canon = conferenceIdToCanonical.get(r.committee_conference_id) ?? r.committee_conference_id;
    const merged = { ...r, committee_conference_id: canon };
    const prev = byCanon.get(canon);
    if (!prev) {
      byCanon.set(canon, merged);
      continue;
    }
    const prevT = new Date(prev.updated_at).getTime();
    const nextT = new Date(merged.updated_at).getTime();
    if (nextT >= prevT) byCanon.set(canon, merged);
  }
  return [...rest, ...byCanon.values()];
}

/** Aggregates per-chair delegate feedback for SMT view (individual responses stay delegate-only in RLS). */
export function aggregateDelegateChairFeedbackBySeat(
  seats: ChairSeat[],
  rows: {
    scope: string;
    committee_conference_id: string;
    subject_profile_id: string | null;
    rubric_scores: Record<string, number> | null;
  }[],
  keys: string[]
): DelegateChairFeedbackAggregate[] {
  const delegateRows = rows.filter((r) => r.scope === "chair_by_delegate");
  return seats.map((seat) => {
    const matching = delegateRows.filter(
      (r) =>
        r.committee_conference_id === seat.committee_conference_id &&
        r.subject_profile_id === seat.chair_profile_id
    );
    if (matching.length === 0) {
      return {
        committee_conference_id: seat.committee_conference_id,
        chair_profile_id: seat.chair_profile_id,
        responseCount: 0,
        avgTotal: 0,
      };
    }
    const totals = matching.map((r) => rubricNumericTotalForKeys(r.rubric_scores ?? null, keys));
    const sum = totals.reduce((a, b) => a + b, 0);
    return {
      committee_conference_id: seat.committee_conference_id,
      chair_profile_id: seat.chair_profile_id,
      responseCount: matching.length,
      avgTotal: sum / matching.length,
    };
  });
}

export type CommitteeRow = {
  id: string;
  committee: string | null;
  name: string | null;
};

/** SMT must score every chair seat and every committee chair report for the active event. */
export function evaluateSmtParticipationReadiness(
  expectedChairs: ChairSeat[],
  expectedCommittees: CommitteeRow[],
  rows: {
    scope: ParticipationScope;
    committee_conference_id: string;
    subject_profile_id: string | null;
    rubric_scores: Record<string, number> | null;
  }[]
): { ok: boolean; missingChairs: string[]; missingReports: string[] } {
  const chairKeys = rubricKeysForParticipationScope("chair_by_smt");
  const reportKeys = rubricKeysForParticipationScope("chair_report_by_smt");

  const chairRows = rows.filter((r) => r.scope === "chair_by_smt");
  const reportRows = rows.filter((r) => r.scope === "chair_report_by_smt");

  const missingChairs: string[] = [];
  for (const seat of expectedChairs) {
    const row = chairRows.find(
      (r) => r.committee_conference_id === seat.committee_conference_id && r.subject_profile_id === seat.chair_profile_id
    );
    if (!isRubricScoresComplete(row?.rubric_scores ?? null, chairKeys)) {
      missingChairs.push(`${seat.committeeLabel} — ${seat.chairName}`);
    }
  }

  const missingReports: string[] = [];
  for (const c of expectedCommittees) {
    const row = reportRows.find((r) => r.committee_conference_id === c.id);
    if (!isRubricScoresComplete(row?.rubric_scores ?? null, reportKeys)) {
      const label = c.committee?.trim() || c.name?.trim() || c.id.slice(0, 8);
      missingReports.push(label);
    }
  }

  return {
    ok: missingChairs.length === 0 && missingReports.length === 0,
    missingChairs,
    missingReports,
  };
}
