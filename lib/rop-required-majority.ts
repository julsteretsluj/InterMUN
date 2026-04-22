import type { VoteType } from "@/types/database";
import { normalizeProcedureProfile, type ProcedureProfile } from "@/lib/procedure-profiles";

/** Values persisted on `vote_items.required_majority`. */
export type StoredVoteMajority = "simple" | "2/3";

/**
 * Default voting threshold aligned with **UN General Assembly–style** practice and common MUN RoP:
 *
 * - **Simple majority** — procedural motions (caucuses, open/close debate, set agenda, suspension,
 *   divide the question as procedure, roll-call vote *motion*, etc.).
 * - **Two-thirds** — substantive questions: adopting a **draft resolution** or **draft amendment**,
 *   and procedural motions whose effect is to **approve an amendment** (`procedure_code === "amendment"`).
 *
 * Conference handbooks may vary; this is the platform default until per-event RoP config exists.
 */
export function ropRequiredMajority(
  voteType: VoteType,
  procedureCode: string | null,
  procedureProfile?: ProcedureProfile | string | null
): StoredVoteMajority {
  const profile = normalizeProcedureProfile(procedureProfile);
  if (profile === "eu_parliament") {
    const euTwoThirdsCodes = new Set([
      "open_debate",
      "close_debate",
      "divide_question",
      "exclude_public",
      "roll_call_vote",
      "adjourn",
      "suspend",
      "shadow_meeting",
      "clause_by_clause",
    ]);
    if (voteType === "resolution" || voteType === "amendment") {
      return "simple";
    }
    if (voteType === "motion" && procedureCode && euTwoThirdsCodes.has(procedureCode)) {
      return "2/3";
    }
    return "simple";
  }

  if (voteType === "resolution" || voteType === "amendment") {
    return "2/3";
  }
  if (voteType === "motion" && procedureCode === "amendment") {
    return "2/3";
  }
  return "simple";
}
