import type { VoteType } from "@/types/database";

/**
 * Disruptiveness score for competing motions (common MUN / parliamentary practice).
 * **Higher = more disruptive = voted on first** when several motions are pending.
 *
 * Ordering is approximate; conference handbooks may differ. Adjourn / suspend / close debate
 * are treated as more dilatory than caucuses; substantive-style items fall in the middle.
 */
export function motionDisruptivenessScore(
  voteType: VoteType,
  procedureCode: string | null
): number {
  if (voteType === "resolution") return 78;
  if (voteType === "amendment") return 72;

  const byCode: Record<string, number> = {
    adjourn: 100,
    suspend: 96,
    close_debate: 90,
    exclude_public: 84,
    roll_call_vote: 78,
    divide_question: 74,
    amendment: 72,
    clause_by_clause: 70,
    unmoderated_caucus: 58,
    moderated_caucus: 50,
    consultation: 44,
    extend_opening_speech: 34,
    for_against_speeches: 30,
    set_agenda: 28,
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
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = motionDisruptivenessScore(a.vote_type, a.procedure_code);
    const db = motionDisruptivenessScore(b.vote_type, b.procedure_code);
    if (db !== da) return db - da;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
