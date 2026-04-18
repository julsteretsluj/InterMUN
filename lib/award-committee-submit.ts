import type { SupabaseClient } from "@supabase/supabase-js";
import type { NominationRubricType } from "@/lib/seamuns-award-scoring";
import { evaluateChairAwardSubmissionReadiness } from "@/lib/award-submission";

type OpenNomRow = {
  nomination_type: NominationRubricType;
  rank: number;
  nominee_profile_id: string | null;
  rubric_scores: Record<string, number> | null;
  status: string;
};

export type PromoteCommitteeDraftsResult =
  | { ok: true; didPromote: true }
  | { ok: true; didPromote: false; reason: "already_submitted" | "no_drafts" | "incomplete" | "not_due" }
  | { ok: false; error: string };

async function seatedDelegatesCountForCommittee(
  supabase: SupabaseClient,
  committeeConferenceId: string
): Promise<number> {
  const { data: allocRows } = await supabase
    .from("allocations")
    .select("user_id")
    .eq("conference_id", committeeConferenceId)
    .not("user_id", "is", null);
  const uids = [...new Set((allocRows ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  if (uids.length === 0) return 0;
  const { data: seatProfiles } = await supabase.from("profiles").select("id, role").in("id", uids);
  return (seatProfiles ?? []).filter((p) => p.role !== "chair").length;
}

/**
 * Moves all draft rows for a committee to pending (SMT queue) when every required slot is complete.
 * Skips if any row is already pending, or if `onlyIfPastDeadline` is true and the deadline has not passed.
 */
export async function promoteCommitteeDraftsToPending(
  supabase: SupabaseClient,
  committeeConferenceId: string,
  options: {
    onlyIfPastDeadline: boolean;
    isPastDeadline: () => boolean;
    requireCompleteForIncomplete: boolean;
  }
): Promise<PromoteCommitteeDraftsResult> {
  if (options.onlyIfPastDeadline && !options.isPastDeadline()) {
    return { ok: true, didPromote: false, reason: "not_due" };
  }

  const { data: rows, error: fetchErr } = await supabase
    .from("award_nominations")
    .select("nomination_type, rank, nominee_profile_id, rubric_scores, status")
    .eq("committee_conference_id", committeeConferenceId)
    .in("status", ["draft", "pending"]);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const list = (rows ?? []) as OpenNomRow[];
  if (list.some((r) => r.status === "pending")) {
    return { ok: true, didPromote: false, reason: "already_submitted" };
  }

  const drafts = list.filter((r) => r.status === "draft");
  if (drafts.length === 0) {
    return { ok: true, didPromote: false, reason: "no_drafts" };
  }

  const seatedCount = await seatedDelegatesCountForCommittee(supabase, committeeConferenceId);
  const { ok: complete, missing } = evaluateChairAwardSubmissionReadiness(drafts, seatedCount);
  if (!complete) {
    if (options.requireCompleteForIncomplete) {
      return {
        ok: false,
        error: `Complete every required slot before submitting. Missing: ${missing.join(", ")}.`,
      };
    }
    return { ok: true, didPromote: false, reason: "incomplete" };
  }

  const now = new Date().toISOString();
  const { data: updatedRows, error: upErr } = await supabase
    .from("award_nominations")
    .update({
      status: "pending",
      submitted_to_smt_at: now,
      updated_at: now,
    })
    .eq("committee_conference_id", committeeConferenceId)
    .eq("status", "draft")
    .select("id");

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const updatedCount = updatedRows?.length ?? 0;
  if (updatedCount !== drafts.length) {
    return {
      ok: false,
      error:
        updatedCount === 0
          ? "Submit failed (no rows updated). Ask your tech lead to apply the latest database migration for award nominations, or ensure you are the chair for this committee."
          : `Submit was incomplete (${updatedCount}/${drafts.length} nominations updated). Try again or contact support.`,
    };
  }

  return { ok: true, didPromote: true };
}
