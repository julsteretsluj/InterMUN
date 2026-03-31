import type { VoteType } from "@/types/database";

/** How consultation vs moderated caucus rank when both are pending (handbook vs alternate RoP). */
export type CaucusDisruptivenessPrecedence = "consultation_first" | "moderated_first";

function caucusScores(precedence: CaucusDisruptivenessPrecedence) {
  if (precedence === "consultation_first") {
    return { unmoderated_caucus: 58, consultation: 54, moderated_caucus: 50 };
  }
  return { unmoderated_caucus: 58, moderated_caucus: 54, consultation: 48 };
}

/**
 * Disruptiveness score for competing motions (common MUN / parliamentary practice).
 * **Higher = more disruptive = voted on first** when several motions are pending.
 *
 * Caucus trio respects {@link CaucusDisruptivenessPrecedence}: by default consultation ranks
 * above moderated caucus (SEAMUNs-style); set `moderated_first` when your handbook inverts that.
 */
export function motionDisruptivenessScore(
  voteType: VoteType,
  procedureCode: string | null,
  caucusPrecedence: CaucusDisruptivenessPrecedence = "consultation_first"
): number {
  if (voteType === "resolution") return 78;
  if (voteType === "amendment") return 72;

  const cu = caucusScores(caucusPrecedence);
  const byCode: Record<string, number> = {
    adjourn: 100,
    suspend: 96,
    close_debate: 90,
    exclude_public: 84,
    roll_call_vote: 78,
    divide_question: 74,
    amendment: 72,
    clause_by_clause: 70,
    unmoderated_caucus: cu.unmoderated_caucus,
    consultation: cu.consultation,
    moderated_caucus: cu.moderated_caucus,
    extend_opening_speech: 34,
    for_against_speeches: 30,
    set_agenda: 28,
    open_gsl: 26,
    open_debate: 24,
    silent_prayer: 18,
    minute_silent: 18,
  };

  if (procedureCode && byCode[procedureCode] != null) {
    return byCode[procedureCode]!;
  }

  return 40;
}

export function sortMotionsMostDisruptiveFirst<
  T extends { vote_type: VoteType; procedure_code: string | null; created_at: string },
>(rows: T[], caucusPrecedence: CaucusDisruptivenessPrecedence = "consultation_first"): T[] {
  return [...rows].sort((a, b) => {
    const da = motionDisruptivenessScore(a.vote_type, a.procedure_code, caucusPrecedence);
    const db = motionDisruptivenessScore(b.vote_type, b.procedure_code, caucusPrecedence);
    if (db !== da) return db - da;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
