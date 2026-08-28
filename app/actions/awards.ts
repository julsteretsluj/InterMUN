// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { createClient } from "@/lib/supabase/server";
import { AWARD_CATEGORIES, isBestResolutionAwardCategory, type AwardScope } from "@/lib/awards";
import {
  rubricKeysForAwardAssignmentCategory,
  smtShouldCollectRubric,
} from "@/lib/award-category-rubric";
import {
  BAND_STORED_SCORE,
  RUBRIC_KEYS_BY_NOMINATION,
  bandAndTierToScore,
  parseBandId,
  parseTierId,
  type NominationRubricType,
} from "@/lib/seamuns-award-scoring";
import { revalidatePath } from "next/cache";
import { awardEvidenceValidationMessage, hasValidAwardEvidence } from "@/lib/award-evidence";
import { isSingleWinnerNominationType } from "@/lib/award-nomination-review";
import { isPastAwardSubmissionDeadline } from "@/lib/award-submission";
import { promoteCommitteeDraftsToPending } from "@/lib/award-committee-submit";
import { getCommitteeAwardScope, resolveCanonicalCommitteeConferenceId } from "@/lib/conference-committee-canonical";
import { getCommitteeDelegateMatrixStatus, fetchScorableDelegateProfileIds } from "@/lib/seated-delegates-for-awards";
import { getActiveEventId } from "@/lib/active-event-cookie";
import type { SupabaseClient } from "@supabase/supabase-js";

type NominationType = NominationRubricType;

/** Award assignment form: same `score_${key}` fields as chair nominations (1–8 each). */
function parseRubricScoresForAssignmentKeys(formData: FormData, keys: string[]): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const key of keys) {
    const scoreRaw = String(formData.get(`score_${key}`) ?? "").trim();
    if (scoreRaw === "") return null;
    const direct = Number(scoreRaw);
    if (Number.isInteger(direct) && direct >= 1 && direct <= 8) {
      out[key] = direct;
      continue;
    }
    const bandRaw = String(formData.get(`band_${key}`) ?? "").trim();
    const band = parseBandId(bandRaw);
    const tierRaw = String(formData.get(`tier_${key}`) ?? "").trim();
    const tier = parseTierId(tierRaw);
    if (band && tier) {
      out[key] = bandAndTierToScore(band, tier);
      continue;
    }
    if (band) {
      out[key] = BAND_STORED_SCORE[band];
      continue;
    }
    return null;
  }
  return out;
}

function parseRubricScores(formData: FormData, nominationType: NominationType) {
  const keys = RUBRIC_KEYS_BY_NOMINATION[nominationType];
  const out: Record<string, number> = {};
  for (const key of keys) {
    const scoreRaw = String(formData.get(`score_${key}`) ?? "").trim();
    if (scoreRaw !== "") {
      const direct = Number(scoreRaw);
      if (Number.isInteger(direct) && direct >= 1 && direct <= 8) {
        out[key] = direct;
        continue;
      }
    }
    const bandRaw = String(formData.get(`band_${key}`) ?? "").trim();
    const band = parseBandId(bandRaw);
    const tierRaw = String(formData.get(`tier_${key}`) ?? "").trim();
    const tier = parseTierId(tierRaw);
    if (band && tier) {
      out[key] = bandAndTierToScore(band, tier);
      continue;
    }
    if (band) {
      out[key] = BAND_STORED_SCORE[band];
      continue;
    }
    return null;
  }
  return out;
}

async function requireChairOrSmt() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    return { supabase, user, ok: false as const };
  }
  return { supabase, user, ok: true as const };
}

function scopeForCategory(category: string): AwardScope | undefined {
  return AWARD_CATEGORIES.find((c) => c.id === category)?.scope;
}

/**
 * Ensures an award recipient is actually within the award's scope:
 * - committee awards: recipient must be a delegate seated in that committee,
 * - conference-wide awards: recipient must be a delegate seated in the active event,
 * - chair (collective_person) awards: recipient must be a chair.
 */
async function recipientProfileInScope(
  supabase: SupabaseClient,
  params: { scope: AwardScope; recipientProfileId: string; committeeConferenceIdCanonical: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { scope, recipientProfileId, committeeConferenceIdCanonical } = params;
  if (!recipientProfileId) return { ok: true };

  const { data: rp } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", recipientProfileId)
    .maybeSingle();
  const role = rp?.role?.toString().trim().toLowerCase();

  if (scope === "collective_person") {
    if (role !== "chair") {
      return { ok: false, error: "This award can only be given to a committee chair." };
    }
    return { ok: true };
  }

  if (role && role !== "delegate") {
    return { ok: false, error: "Award recipients must be delegates seated in scope, not staff." };
  }

  if (scope === "committee") {
    if (!committeeConferenceIdCanonical) {
      return { ok: false, error: "Select a committee for this award." };
    }
    const seatScope = await getCommitteeAwardScope(supabase, committeeConferenceIdCanonical);
    const { data } = await supabase
      .from("allocations")
      .select("id")
      .in("conference_id", seatScope.siblingConferenceIds)
      .eq("user_id", recipientProfileId)
      .limit(1)
      .maybeSingle();
    if (!data?.id) {
      return { ok: false, error: "That delegate is not seated in the selected committee." };
    }
    return { ok: true };
  }

  if (scope === "conference_wide") {
    const eventId = await getActiveEventId();
    if (!eventId) return { ok: true };
    const { data: confs } = await supabase.from("conferences").select("id").eq("event_id", eventId);
    const ids = (confs ?? []).map((c) => c.id);
    if (ids.length === 0) return { ok: true };
    const { data } = await supabase
      .from("allocations")
      .select("id")
      .in("conference_id", ids)
      .eq("user_id", recipientProfileId)
      .limit(1)
      .maybeSingle();
    if (!data?.id) {
      return { ok: false, error: "That delegate is not seated in this conference." };
    }
    return { ok: true };
  }

  return { ok: true };
}

/** Aligns with saveAwardAssignment: committee-scoped awards store a committee id; conference-wide use null. */
function committeeConferenceIdForAwardAssignment(category: string, nominationCommitteeId: string): string | null {
  const scope = scopeForCategory(category);
  if (!scope) return null;
  if (scope === "committee") return nominationCommitteeId;
  return null;
}

export async function saveAwardAssignment(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { error: "Only chairs, SMT, and website admins can edit awards." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const committeeConferenceId = String(formData.get("committee_conference_id") ?? "").trim();
  const recipientProfileId = String(formData.get("recipient_profile_id") ?? "").trim();
  const recipientCommitteeId = String(formData.get("recipient_committee_id") ?? "").trim();
  const resolutionId = String(formData.get("resolution_id") ?? "").trim();
  let notes = String(formData.get("notes") ?? "").trim();
  const sortOrder = parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;

  if (!category || !AWARD_CATEGORIES.some((c) => c.id === category)) {
    return { error: "Invalid award category." };
  }

  const scope = scopeForCategory(category)!;
  const bestResolution = isBestResolutionAwardCategory(category);

  let committee_conference_id: string | null =
    scope === "committee" && committeeConferenceId
      ? await resolveCanonicalCommitteeConferenceId(auth.supabase, committeeConferenceId)
      : null;
  let recipient_committee_id =
    scope === "collective_committee" ? recipientCommitteeId || null : null;
  let recipient_profile_id =
    scope === "collective_committee" ? null : recipientProfileId || null;
  let resolution_id: string | null = null;

  if (bestResolution) {
    if (!resolutionId) return { error: "Select a submitted resolution." };
    const { data: resolution, error: resolutionErr } = await auth.supabase
      .from("resolutions")
      .select("id, conference_id, google_docs_url, main_submitters, status, forwarded_to_smt_at")
      .eq("id", resolutionId)
      .maybeSingle();
    if (resolutionErr) return { error: resolutionErr.message };
    if (!resolution) return { error: "Resolution not found." };
    const submitted =
      (resolution.status ?? "draft") === "finalized" || Boolean(resolution.forwarded_to_smt_at);
    if (!submitted) {
      return { error: "Only submitted (finalized) resolutions can receive Best Resolution." };
    }
    const mains = (resolution.main_submitters ?? []).filter(Boolean);
    if (!mains[0]) {
      return { error: "This resolution has no main submitter to record as recipient." };
    }
    const canonicalId = await resolveCanonicalCommitteeConferenceId(
      auth.supabase,
      resolution.conference_id
    );
    resolution_id = resolution.id;
    recipient_profile_id = mains[0];
    committee_conference_id = category === "committee_best_resolution" ? canonicalId : null;
    recipient_committee_id = null;
    const { data: bloc } = await auth.supabase
      .from("blocs")
      .select("name")
      .eq("resolution_id", resolution.id)
      .maybeSingle();
    if (!notes) {
      const blocName = bloc?.name?.trim() || "Resolution";
      notes = resolution.google_docs_url?.trim()
        ? `${blocName} — ${resolution.google_docs_url.trim()}`
        : blocName;
    }
  } else if (scope === "committee" && !committee_conference_id) {
    return { error: "Select a committee for this award." };
  }

  if (recipient_profile_id) {
    const scopeCheck = await recipientProfileInScope(auth.supabase, {
      scope,
      recipientProfileId: recipient_profile_id,
      committeeConferenceIdCanonical: committee_conference_id,
    });
    if (!scopeCheck.ok) {
      return { error: scopeCheck.error };
    }
  }

  const rubricKeys = rubricKeysForAwardAssignmentCategory(category);
  const collectRubric = smtShouldCollectRubric(scope, category) && rubricKeys.length > 0;
  let rubric_scores: Record<string, number> | null = null;
  if (collectRubric) {
    const parsed = parseRubricScoresForAssignmentKeys(formData, rubricKeys);
    if (!parsed) {
      return {
        error:
          "Complete every rubric criterion for this award (pick band, then low/high within the band—same as chair Score page).",
      };
    }
    rubric_scores = parsed;
  }

  const payload = {
    category,
    committee_conference_id,
    recipient_profile_id,
    recipient_committee_id,
    notes: notes || null,
    sort_order: sortOrder,
    rubric_scores,
    updated_at: new Date().toISOString(),
    ...(bestResolution ? { resolution_id } : {}),
  };

  const supabase = auth.supabase;

  if (id) {
    const { error } = await supabase.from("award_assignments").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("award_assignments").insert({
      ...payload,
      created_by: auth.user.id,
      created_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/smt/awards");
  revalidatePath("/chair/awards");
  revalidatePath("/profile");
  return { success: true };
}

export async function deleteAwardAssignment(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { error: "Only chairs, SMT, and website admins can delete awards." };
  }
  const { error } = await auth.supabase.from("award_assignments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/smt/awards");
  revalidatePath("/chair/awards");
  revalidatePath("/profile");
  return { success: true };
}

async function requireSmtOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "smt" && role !== "admin") {
    return { supabase, user, ok: false as const };
  }
  return { supabase, user, ok: true as const };
}

export type SubmitChairNominationResult = { ok: true } | { ok: false; error: string };

/** After the submission deadline, promotes complete draft batches when a chair opens the awards page. */
export async function runChairAwardAutoSubmitIfDue(committeeConferenceId: string): Promise<void> {
  if (!isPastAwardSubmissionDeadline()) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "chair") return;

  const { data: seat } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", committeeConferenceId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!seat?.id) return;

  const result = await promoteCommitteeDraftsToPending(supabase, committeeConferenceId, {
    onlyIfPastDeadline: true,
    isPastDeadline: isPastAwardSubmissionDeadline,
    requireCompleteForIncomplete: false,
  });

  if (result.ok && result.didPromote) {
    revalidatePath("/chair/awards");
    revalidatePath("/smt/awards");
    revalidatePath("/smt");
    revalidatePath("/profile");
  }
}

export async function submitCommitteeAwardDraftsToSmtAction(
  committeeConferenceId: string
): Promise<SubmitChairNominationResult> {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { ok: false, error: "You must be signed in as a chair, SMT member, or admin." };
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();

  if (role === "admin") {
    // ok
  } else {
    if (role !== "chair") {
      return { ok: false, error: "Only committee chairs (or admins) can submit nominations to SMT." };
    }
    const { data: canManage } = await auth.supabase
      .from("allocations")
      .select("id")
      .eq("conference_id", committeeConferenceId)
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle();
    if (!canManage?.id) {
      return { ok: false, error: "You must be allocated as chair for this committee to submit." };
    }
  }

  const result = await promoteCommitteeDraftsToPending(auth.supabase, committeeConferenceId, {
    onlyIfPastDeadline: false,
    isPastDeadline: () => true,
    requireCompleteForIncomplete: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.didPromote) {
    revalidatePath("/chair/awards");
    revalidatePath("/smt/awards");
    revalidatePath("/smt");
    revalidatePath("/profile");
    return { ok: true };
  }
  if (result.reason === "already_submitted") {
    return { ok: false, error: "These nominations were already sent to SMT." };
  }
  if (result.reason === "no_drafts") {
    return { ok: false, error: "Nothing to submit yet. Save your required slots first." };
  }
  return { ok: false, error: "Could not submit nominations. Ensure every required slot is complete." };
}

export async function submitChairTopNominationAction(
  formData: FormData
): Promise<SubmitChairNominationResult> {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { ok: false, error: "You must be signed in as a chair, SMT member, or admin." };
  }

  const committeeIdRaw = String(formData.get("committee_conference_id") ?? "").trim();
  const scope = await getCommitteeAwardScope(auth.supabase, committeeIdRaw);
  const committeeId = scope.canonicalConferenceId;
  const siblingConferenceIds = scope.siblingConferenceIds;

  const nomineeId = String(formData.get("nominee_profile_id") ?? "").trim();
  const rankRaw = Number(String(formData.get("rank") ?? "0"));
  const rank = Number.isInteger(rankRaw) ? rankRaw : 0;
  const nominationType = String(formData.get("nomination_type") ?? "").trim();
  const evidence = String(formData.get("evidence_note") ?? "").trim();

  const validNominationType =
    nominationType === "committee_best_delegate" ||
    nominationType === "committee_honourable_mention" ||
    nominationType === "committee_best_position_paper" ||
    nominationType === "conference_best_delegate";
  if (!committeeIdRaw || !rank || !validNominationType) {
    return { ok: false, error: "Invalid nomination form data." };
  }
  if (nominationType === "conference_best_delegate" && rank !== 1) {
    return { ok: false, error: "Invalid rank for overall Best Delegate." };
  }
  if (
    (nominationType === "committee_best_delegate" || nominationType === "committee_best_position_paper") &&
    (rank < 1 || rank > 2)
  ) {
    return { ok: false, error: "Invalid rank for this nomination type." };
  }
  if (nominationType === "committee_honourable_mention" && (rank < 1 || rank > 3)) {
    return { ok: false, error: "Invalid rank for Honourable Mention." };
  }

  if (nomineeId && !hasValidAwardEvidence(evidence)) {
    return { ok: false, error: awardEvidenceValidationMessage() };
  }

  if (!nomineeId) {
    if (nominationType === "committee_honourable_mention") {
      const { error } = await auth.supabase
        .from("award_nominations")
        .delete()
        .in("committee_conference_id", siblingConferenceIds)
        .eq("nomination_type", nominationType)
        .eq("rank", rank)
        .eq("status", "draft");
      if (error) return { ok: false, error: error.message };
      revalidatePath("/chair/awards");
      revalidatePath("/smt/awards");
      revalidatePath("/smt");
      revalidatePath("/profile");
      return { ok: true };
    }
    return { ok: false, error: "Select a nominee for this slot." };
  }

  const rubricScores = parseRubricScores(formData, nominationType as NominationType);
  if (!rubricScores) {
    return {
      ok: false,
      error: "Choose a band and Low or High for every criterion (scores 1–8 each).",
    };
  }

  const { data: canManage } = await auth.supabase
    .from("allocations")
    .select("id")
    .in("conference_id", siblingConferenceIds)
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();
  if (!canManage?.id) {
    const { data: p } = await auth.supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();
    const role = p?.role?.toString().trim().toLowerCase();
    if (role !== "smt" && role !== "admin") {
      return {
        ok: false,
        error: "You must be allocated to this committee as chair to save nominations.",
      };
    }
  }

  const { data: nomineeInCommittee } = await auth.supabase
    .from("allocations")
    .select("id")
    .in("conference_id", siblingConferenceIds)
    .eq("user_id", nomineeId)
    .limit(1)
    .maybeSingle();
  if (!nomineeInCommittee?.id) {
    return { ok: false, error: "That delegate is not seated in this committee." };
  }

  const { data: nomineeProfile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", nomineeId)
    .maybeSingle();
  const nomineeRole = nomineeProfile?.role?.toString().trim().toLowerCase();
  if (nomineeRole === "chair") {
    return { ok: false, error: "Nominees must be delegates or country seats, not the committee chair." };
  }
  if (nomineeRole === "smt" || nomineeRole === "admin" || nomineeRole === "advisor") {
    return { ok: false, error: "SMT, admins, and advisors cannot receive award nominations." };
  }

  const matrixStatus = await getCommitteeDelegateMatrixStatus(
    auth.supabase,
    committeeId,
    siblingConferenceIds
  );
  if (!matrixStatus.ok) {
    return {
      ok: false,
      error: `Score every seated delegate in the matrix first (${matrixStatus.missing.length} of ${matrixStatus.total} still incomplete). Award nominations do not replace the full-delegate matrix.`,
    };
  }

  if (nominationType === "committee_honourable_mention") {
    const seatedCount = (await fetchScorableDelegateProfileIds(auth.supabase, siblingConferenceIds)).length;
    const maxHmRank = seatedCount > 22 ? 3 : 2;
    if (rank > maxHmRank) {
      return { ok: false, error: "This Honourable Mention slot is not used for your committee size." };
    }
  }

  const { data: profileForRole } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  const actorRole = profileForRole?.role?.toString().trim().toLowerCase();

  const { data: existingRows } = await auth.supabase
    .from("award_nominations")
    .select("id, status, committee_conference_id")
    .in("committee_conference_id", siblingConferenceIds)
    .eq("nomination_type", nominationType)
    .eq("rank", rank)
    .in("status", ["draft", "pending"]);

  const cand = existingRows ?? [];
  const pendingRow = cand.find((r) => r.status === "pending");
  const existing =
    pendingRow ??
    cand.find((r) => r.committee_conference_id === committeeId) ??
    cand[0];

  if (existing?.status === "pending" && actorRole !== "smt" && actorRole !== "admin") {
    return {
      ok: false,
      error: "This nomination was already submitted to SMT and cannot be edited here.",
    };
  }

  if (existing?.id) {
    const { error } = await auth.supabase
      .from("award_nominations")
      .update({
        committee_conference_id: committeeId,
        nominee_profile_id: nomineeId,
        evidence_note: evidence || null,
        rubric_scores: rubricScores,
        nomination_type: nominationType,
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await auth.supabase.from("award_nominations").insert({
      committee_conference_id: committeeId,
      nominee_profile_id: nomineeId,
      nomination_type: nominationType,
      rank,
      evidence_note: evidence || null,
      rubric_scores: rubricScores,
      created_by: auth.user.id,
      status: "draft",
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/chair/awards");
  revalidatePath("/smt/awards");
  revalidatePath("/smt");
  revalidatePath("/profile");
  return { ok: true };
}

export async function rejectNominationAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireSmtOrAdmin();
  if (!auth.ok || !auth.user) {
    return { error: "Only SMT and website admins can reject nominations." };
  }

  const nominationId = String(formData.get("nomination_id") ?? "").trim();
  if (!nominationId) {
    return { error: "Missing nomination." };
  }

  const { data: nomination } = await auth.supabase
    .from("award_nominations")
    .select("id, status")
    .eq("id", nominationId)
    .maybeSingle();

  if (!nomination) {
    return { error: "Nomination not found." };
  }
  if (nomination.status !== "pending") {
    return { error: "This nomination is no longer pending." };
  }

  const now = new Date().toISOString();
  const { error } = await auth.supabase
    .from("award_nominations")
    .update({
      status: "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", nominationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/smt/awards");
  revalidatePath("/smt");
  revalidatePath("/chair/awards");
  return { success: true };
}

/** Ladder round: reject the losing overall Best Delegate nominee; winner stays pending for the next round. */
export async function advanceOverallBestDelegateLadderAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSmtOrAdmin();
  if (!auth.ok || !auth.user) {
    return { success: false, error: "Only SMT and website admins can run the ladder." };
  }

  const winnerId = String(formData.get("winner_nomination_id") ?? "").trim();
  const loserId = String(formData.get("loser_nomination_id") ?? "").trim();
  if (!winnerId || !loserId || winnerId === loserId) {
    return { success: false, error: "Invalid ladder matchup." };
  }

  const { data: rows } = await auth.supabase
    .from("award_nominations")
    .select("id, status, nomination_type, evidence_note")
    .in("id", [winnerId, loserId]);

  const winner = rows?.find((r) => r.id === winnerId);
  const loser = rows?.find((r) => r.id === loserId);
  if (!winner || !loser) {
    return { success: false, error: "Nomination not found." };
  }
  if (winner.nomination_type !== "conference_best_delegate" || loser.nomination_type !== "conference_best_delegate") {
    return { success: false, error: "Ladder matchups are only for overall Best Delegate nominations." };
  }
  if (winner.status !== "pending" || loser.status !== "pending") {
    return { success: false, error: "Both nominees must still be pending." };
  }
  if (!hasValidAwardEvidence(winner.evidence_note) || !hasValidAwardEvidence(loser.evidence_note)) {
    return { success: false, error: "Both nominees need a valid chair evidence statement before SMT can advance the ladder." };
  }

  const now = new Date().toISOString();
  const { error } = await auth.supabase
    .from("award_nominations")
    .update({
      status: "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", loserId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/smt/awards");
  revalidatePath("/smt");
  revalidatePath("/chair/awards");
  return { success: true };
}

export async function promoteNominationToAwardAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSmtOrAdmin();
  if (!auth.ok || !auth.user) {
    return { success: false, error: "Only SMT and website admins can approve nominations." };
  }

  const nominationId = String(formData.get("nomination_id") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!nominationId || !category) {
    return { success: false, error: "Missing nomination or award type." };
  }
  if (!AWARD_CATEGORIES.some((c) => c.id === category)) {
    return { success: false, error: "Invalid award category." };
  }
  if (
    category !== "committee_best_delegate" &&
    category !== "committee_honourable_mention" &&
    category !== "committee_best_position_paper" &&
    category !== "conference_best_delegate"
  ) {
    return { success: false, error: "This award type cannot be set from a chair nomination." };
  }

  const { data: nomination } = await auth.supabase
    .from("award_nominations")
    .select("id, committee_conference_id, nominee_profile_id, nomination_type, rank, evidence_note, status")
    .eq("id", nominationId)
    .maybeSingle();
  if (!nomination) {
    return { success: false, error: "Nomination not found." };
  }
  if (nomination.status !== "pending") {
    return { success: false, error: "This nomination is no longer pending." };
  }

  if (!hasValidAwardEvidence(nomination.evidence_note)) {
    return { success: false, error: awardEvidenceValidationMessage() };
  }

  if (nomination.nomination_type === "conference_best_delegate") {
    const { count, error: countErr } = await auth.supabase
      .from("award_nominations")
      .select("id", { count: "exact", head: true })
      .eq("nomination_type", "conference_best_delegate")
      .eq("status", "pending");
    if (countErr) {
      return { success: false, error: countErr.message };
    }
    if ((count ?? 0) > 1) {
      return {
        success: false,
        error:
          "Finish the Best Delegate (overall) ladder first — only one pending nominee should remain before final approval.",
      };
    }
  }

  if (nomination.nomination_type === "conference_best_delegate" && category !== "conference_best_delegate") {
    return { success: false, error: "Award type does not match this nomination." };
  }
  if (
    (nomination.nomination_type === "committee_best_delegate" ||
      nomination.nomination_type === "committee_honourable_mention" ||
      nomination.nomination_type === "committee_best_position_paper") &&
    category === "conference_best_delegate"
  ) {
    return { success: false, error: "Award type does not match this nomination." };
  }

  if (nomination.nomination_type === "committee_best_delegate" && category !== "committee_best_delegate") {
    return { success: false, error: "Award type does not match this nomination." };
  }
  if (nomination.nomination_type === "committee_honourable_mention" && category !== "committee_honourable_mention") {
    return { success: false, error: "Award type does not match this nomination." };
  }
  if (
    nomination.nomination_type === "committee_best_position_paper" &&
    category !== "committee_best_position_paper"
  ) {
    return { success: false, error: "Award type does not match this nomination." };
  }

  const committeeForAssignment = committeeConferenceIdForAwardAssignment(
    category,
    nomination.committee_conference_id
  );

  const sortOrder = category === "committee_honourable_mention" ? nomination.rank : 0;
  const payload = {
    category,
    committee_conference_id: committeeForAssignment,
    recipient_profile_id: nomination.nominee_profile_id,
    recipient_committee_id: null,
    notes: nomination.evidence_note || "Selected from chair top-2 nomination.",
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  let assignmentId: string | null = null;
  if (
    category === "committee_best_delegate" ||
    category === "committee_best_position_paper" ||
    category === "conference_best_delegate"
  ) {
    let existingQuery = auth.supabase.from("award_assignments").select("id").eq("category", category);
    if (committeeForAssignment === null) {
      existingQuery = existingQuery.is("committee_conference_id", null);
    } else {
      existingQuery = existingQuery.eq("committee_conference_id", committeeForAssignment);
    }
    const { data: existing, error: existingErr } = await existingQuery
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) {
      return { success: false, error: existingErr.message };
    }
    if (existing?.id) {
      const { error } = await auth.supabase.from("award_assignments").update(payload).eq("id", existing.id);
      if (error) {
        return { success: false, error: error.message };
      }
      assignmentId = existing.id;
    } else {
      const { data, error } = await auth.supabase
        .from("award_assignments")
        .insert({
          ...payload,
          created_by: auth.user.id,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (error) {
        return { success: false, error: error.message };
      }
      assignmentId = data?.id ?? null;
    }
  } else {
    const { data, error } = await auth.supabase
      .from("award_assignments")
      .insert({
        ...payload,
        created_by: auth.user.id,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) {
      return { success: false, error: error.message };
    }
    assignmentId = data?.id ?? null;
  }

  const now = new Date().toISOString();
  const { error: nomErr } = await auth.supabase
    .from("award_nominations")
    .update({
      status: "selected",
      selected_award_category: category,
      selected_award_assignment_id: assignmentId,
      reviewed_by: auth.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", nomination.id);
  if (nomErr) {
    return { success: false, error: nomErr.message };
  }

  if (nomination.nomination_type === "conference_best_delegate") {
    const { error: supErr } = await auth.supabase
      .from("award_nominations")
      .update({
        status: "not_selected",
        updated_at: now,
      })
      .eq("nomination_type", "conference_best_delegate")
      .eq("status", "pending")
      .neq("id", nomination.id);
    if (supErr) {
      return { success: false, error: supErr.message };
    }
  } else if (isSingleWinnerNominationType(nomination.nomination_type as NominationRubricType)) {
    const { error: supErr } = await auth.supabase
      .from("award_nominations")
      .update({
        status: "not_selected",
        updated_at: now,
      })
      .eq("committee_conference_id", nomination.committee_conference_id)
      .eq("nomination_type", nomination.nomination_type)
      .eq("status", "pending")
      .neq("id", nomination.id);
    if (supErr) {
      return { success: false, error: supErr.message };
    }
  }

  revalidatePath("/smt/awards");
  revalidatePath("/smt");
  revalidatePath("/chair/awards");
  revalidatePath("/profile");
  return { success: true };
}

export async function selectBestResolutionAwardAction(input: {
  resolutionId: string;
  category: "committee_best_resolution" | "conference_best_resolution";
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSmtOrAdmin();
  if (!auth.ok || !auth.user) {
    return { success: false, error: "Only SMT and website admins can record Best Resolution." };
  }
  if (input.category !== "committee_best_resolution" && input.category !== "conference_best_resolution") {
    return { success: false, error: "Invalid Best Resolution award type." };
  }

  const { data: resolution, error: readErr } = await auth.supabase
    .from("resolutions")
    .select(
      "id, conference_id, google_docs_url, main_submitters, forwarded_to_smt_at"
    )
    .eq("id", input.resolutionId)
    .maybeSingle();
  if (readErr) return { success: false, error: readErr.message };
  if (!resolution) return { success: false, error: "Resolution not found." };
  if (!resolution.forwarded_to_smt_at) {
    return { success: false, error: "Chairs must forward this resolution to secretariat first." };
  }

  const mains = (resolution.main_submitters ?? []).filter(Boolean);
  const recipientProfileId = mains[0] ?? null;
  if (!recipientProfileId) {
    return { success: false, error: "This resolution has no main submitter to record as recipient." };
  }

  const canonicalId = await resolveCanonicalCommitteeConferenceId(
    auth.supabase,
    resolution.conference_id
  );
  const committeeForAssignment =
    input.category === "committee_best_resolution" ? canonicalId : null;

  const { data: bloc } = await auth.supabase
    .from("blocs")
    .select("name")
    .eq("resolution_id", resolution.id)
    .maybeSingle();
  const blocName = bloc?.name?.trim() || "Resolution";
  const notes = resolution.google_docs_url?.trim()
    ? `${blocName} — ${resolution.google_docs_url.trim()}`
    : blocName;

  const now = new Date().toISOString();
  let existingQuery = auth.supabase.from("award_assignments").select("id").eq("category", input.category);
  if (committeeForAssignment === null) {
    existingQuery = existingQuery.is("committee_conference_id", null);
  } else {
    existingQuery = existingQuery.eq("committee_conference_id", committeeForAssignment);
  }
  const { data: existing, error: existingErr } = await existingQuery
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) return { success: false, error: existingErr.message };

  const payload = {
    category: input.category,
    committee_conference_id: committeeForAssignment,
    recipient_profile_id: recipientProfileId,
    recipient_committee_id: null,
    resolution_id: resolution.id,
    notes,
    sort_order: 0,
    updated_at: now,
  };

  if (existing?.id) {
    const { error } = await auth.supabase.from("award_assignments").update(payload).eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await auth.supabase.from("award_assignments").insert({
      ...payload,
      created_by: auth.user.id,
      created_at: now,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/smt/awards");
  revalidatePath("/smt");
  revalidatePath("/chair/awards");
  revalidatePath("/resolutions");
  revalidatePath("/profile");
  return { success: true };
}
