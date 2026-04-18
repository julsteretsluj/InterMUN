import type { SupabaseClient } from "@supabase/supabase-js";
import type { NominationRubricType } from "@/lib/seamuns-award-scoring";
import { evaluateChairAwardSubmissionReadiness } from "@/lib/award-submission";
import { getCommitteeAwardScope, type CommitteeAwardScope } from "@/lib/conference-committee-canonical";

type OpenNomRow = {
  nomination_type: NominationRubricType;
  rank: number;
  nominee_profile_id: string | null;
  rubric_scores: Record<string, number> | null;
  status: string;
};

async function seatedDelegatesCountForSiblingCommittees(
  supabase: SupabaseClient,
  siblingConferenceIds: string[]
): Promise<number> {
  if (siblingConferenceIds.length === 0) return 0;
  const { data: allocRows } = await supabase
    .from("allocations")
    .select("user_id")
    .in("conference_id", siblingConferenceIds)
    .not("user_id", "is", null);
  const uids = [...new Set((allocRows ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  if (uids.length === 0) return 0;
  const { data: seatProfiles } = await supabase.from("profiles").select("id, role").in("id", uids);
  return (seatProfiles ?? []).filter((p) => p.role !== "chair").length;
}

/** Collapse duplicate draft rows across topic-level conference ids onto the canonical committee row. */
async function reconcileDuplicateDraftNominationsToCanonical(
  supabase: SupabaseClient,
  scope: CommitteeAwardScope
): Promise<void> {
  if (scope.siblingConferenceIds.length <= 1) return;
  const canonical = scope.canonicalConferenceId;

  const { data: rows, error } = await supabase
    .from("award_nominations")
    .select("id, nomination_type, rank, committee_conference_id")
    .in("committee_conference_id", scope.siblingConferenceIds)
    .eq("status", "draft");

  if (error || !rows?.length) return;

  const byKey = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.nomination_type}:${r.rank}`;
    const arr = byKey.get(k) ?? [];
    arr.push(r);
    byKey.set(k, arr);
  }

  for (const [, arr] of byKey) {
    if (arr.length <= 1) continue;
    const onCanon = arr.filter((x) => x.committee_conference_id === canonical);
    const offCanon = arr.filter((x) => x.committee_conference_id !== canonical);
    if (onCanon.length > 0) {
      for (const x of offCanon) {
        await supabase.from("award_nominations").delete().eq("id", x.id);
      }
    } else {
      const [keep, ...drop] = offCanon;
      for (const x of drop) {
        await supabase.from("award_nominations").delete().eq("id", x.id);
      }
      if (keep && keep.committee_conference_id !== canonical) {
        await supabase
          .from("award_nominations")
          .update({ committee_conference_id: canonical })
          .eq("id", keep.id);
      }
    }
  }
}

export type PromoteCommitteeDraftsResult =
  | { ok: true; didPromote: true }
  | { ok: true; didPromote: false; reason: "already_submitted" | "no_drafts" | "incomplete" | "not_due" }
  | { ok: false; error: string };

/**
 * Moves all draft rows for a committee to pending (SMT queue) when every required slot is complete.
 * Skips if any row is already pending, or if `onlyIfPastDeadline` is true and the deadline has not passed.
 * `committeeConferenceId` may be any topic-level `conferences.id`; awards are scoped to the canonical row per committee name.
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

  const scope = await getCommitteeAwardScope(supabase, committeeConferenceId);
  const canonicalId = scope.canonicalConferenceId;

  const { data: rows, error: fetchErr } = await supabase
    .from("award_nominations")
    .select("nomination_type, rank, nominee_profile_id, rubric_scores, status")
    .in("committee_conference_id", scope.siblingConferenceIds)
    .in("status", ["draft", "pending"]);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const list = (rows ?? []) as OpenNomRow[];
  if (list.some((r) => r.status === "pending")) {
    return { ok: true, didPromote: false, reason: "already_submitted" };
  }

  await reconcileDuplicateDraftNominationsToCanonical(supabase, scope);

  const { data: rowsAfter, error: fetch2Err } = await supabase
    .from("award_nominations")
    .select("nomination_type, rank, nominee_profile_id, rubric_scores, status")
    .eq("committee_conference_id", canonicalId)
    .eq("status", "draft");

  if (fetch2Err) {
    return { ok: false, error: fetch2Err.message };
  }

  const drafts = (rowsAfter ?? []) as OpenNomRow[];
  if (drafts.length === 0) {
    return { ok: true, didPromote: false, reason: "no_drafts" };
  }

  const seatedCount = await seatedDelegatesCountForSiblingCommittees(supabase, scope.siblingConferenceIds);
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
    .eq("committee_conference_id", canonicalId)
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
