/** Minimum length for chair evidence statements before SMT submission / approval. */
export const MIN_AWARD_EVIDENCE_CHARS = 40;

export function hasValidAwardEvidence(note: string | null | undefined): boolean {
  return (note ?? "").trim().length >= MIN_AWARD_EVIDENCE_CHARS;
}

export function awardEvidenceValidationMessage(): string {
  return `Add an evidence statement of at least ${MIN_AWARD_EVIDENCE_CHARS} characters explaining why this delegate deserves the award.`;
}
