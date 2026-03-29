export const CLAUSE_TARGET_PROCEDURE_CODES = new Set([
  "divide_question",
  "clause_by_clause",
  "amendment",
]);

/** Motions that require a draft resolution target but not specific clauses. */
export const RESOLUTION_ONLY_PROCEDURE_CODES = new Set(["for_against_speeches"]);

export function motionRequiresClauseTargets(procedureCode: string | null | undefined) {
  return !!procedureCode && CLAUSE_TARGET_PROCEDURE_CODES.has(procedureCode);
}

export function motionRequiresResolutionOnly(procedureCode: string | null | undefined) {
  return !!procedureCode && RESOLUTION_ONLY_PROCEDURE_CODES.has(procedureCode);
}

export function majorityThreshold(requiredMajority: string, totalVotes: number) {
  return requiredMajority === "2/3" ? (totalVotes * 2) / 3 : totalVotes / 2;
}

export function didMotionPass(requiredMajority: string, yesVotes: number, totalVotes: number) {
  return yesVotes > majorityThreshold(requiredMajority, totalVotes);
}

export function nextClauseNumber(existingClauseNumbers: number[]) {
  return existingClauseNumbers.length > 0 ? Math.max(...existingClauseNumbers) + 1 : 1;
}

