// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { RollAttendance } from "@/lib/roll-attendance";

export const CLAUSE_TARGET_PROCEDURE_CODES = new Set([
  "divide_question",
  "clause_by_clause",
  "amendment",
]);

/** Motions that require a draft resolution target but not specific clauses. */
export const RESOLUTION_ONLY_PROCEDURE_CODES = new Set(["for_against_speeches", "open_debate"]);

export function motionRequiresClauseTargets(procedureCode: string | null | undefined) {
  return !!procedureCode && CLAUSE_TARGET_PROCEDURE_CODES.has(procedureCode);
}

export function motionRequiresResolutionOnly(procedureCode: string | null | undefined) {
  return !!procedureCode && RESOLUTION_ONLY_PROCEDURE_CODES.has(procedureCode);
}

export const MIN_RESOLUTION_MAIN_SUBMITTERS = 2;
export const MIN_RESOLUTION_CO_SUBMITTERS = 2;

/** Signatories required to introduce a draft (15% of seated committee, at least 1). */
export function minResolutionSignatories(seatedCount: number): number {
  return Math.max(1, Math.ceil(Math.max(0, seatedCount) * 0.15));
}

export function majorityThreshold(requiredMajority: string, totalVotes: number) {
  return requiredMajority === "2/3" ? (totalVotes * 2) / 3 : totalVotes / 2;
}

export function didMotionPass(requiredMajority: string, yesVotes: number, totalVotes: number) {
  return yesVotes > majorityThreshold(requiredMajority, totalVotes);
}

/**
 * Members counted as **present** on roll (may abstain or present and voting) — denominator for
 * “majority of members present” on procedural motions.
 */
export function membersPresentForMajorityDenominator(
  rollByAllocationId: Map<string, RollAttendance>,
  committeeAllocationIds: string[]
): number {
  let n = 0;
  for (const id of committeeAllocationIds) {
    const att = rollByAllocationId.get(id) ?? "absent";
    if (att === "present_abstain" || att === "present_voting") n++;
  }
  return n;
}

/** Procedural motion passes if YES exceeds simple or 2/3 threshold of members **present** (roll), not only ballots cast. */
export function didProceduralMotionPassAgainstRollPresent(
  requiredMajority: string,
  yesVotes: number,
  membersPresent: number
): boolean {
  if (membersPresent <= 0) return false;
  return yesVotes > majorityThreshold(requiredMajority, membersPresent);
}

export function nextClauseNumber(existingClauseNumbers: number[]) {
  return existingClauseNumbers.length > 0 ? Math.max(...existingClauseNumbers) + 1 : 1;
}

/** Gaps that block forwarding a draft to secretariat for Best Resolution review. */
export type ResolutionSmtForwardGaps = {
  notFinalized: boolean;
  missingDoc: boolean;
  missingClauses: boolean;
  missingMainSubmitters: boolean;
  missingCoSubmitters: boolean;
  missingSignatories: boolean;
};

export function resolutionSmtForwardGaps(input: {
  status?: string | null;
  googleDocsUrl?: string | null;
  clauseCount: number;
  mainSubmitterCount: number;
  coSubmitterCount: number;
  signatoryCount: number;
  seatedCount: number;
}): ResolutionSmtForwardGaps {
  const minSign = minResolutionSignatories(input.seatedCount);
  return {
    notFinalized: (input.status ?? "draft") !== "finalized",
    missingDoc: !input.googleDocsUrl?.trim(),
    missingClauses: input.clauseCount < 1,
    missingMainSubmitters: input.mainSubmitterCount < MIN_RESOLUTION_MAIN_SUBMITTERS,
    missingCoSubmitters: input.coSubmitterCount < MIN_RESOLUTION_CO_SUBMITTERS,
    missingSignatories: input.signatoryCount < minSign,
  };
}

export function isResolutionReadyToForwardToSmt(gaps: ResolutionSmtForwardGaps): boolean {
  return (
    !gaps.notFinalized &&
    !gaps.missingDoc &&
    !gaps.missingClauses &&
    !gaps.missingMainSubmitters &&
    !gaps.missingCoSubmitters &&
    !gaps.missingSignatories
  );
}

