"use server";

import { createClient } from "@/lib/supabase/server";
import { AWARD_CATEGORIES, type AwardScope } from "@/lib/awards";
import {
  BAND_STORED_SCORE,
  RUBRIC_KEYS_BY_NOMINATION,
  bandAndTierToScore,
  parseBandId,
  parseTierId,
  type NominationRubricType,
} from "@/lib/seamuns-award-scoring";
import { revalidatePath } from "next/cache";
import { isSingleWinnerNominationType } from "@/lib/award-nomination-review";

type NominationType = NominationRubricType;

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
  const notes = String(formData.get("notes") ?? "").trim();
  const sortOrder = parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;

  if (!category || !AWARD_CATEGORIES.some((c) => c.id === category)) {
    return { error: "Invalid award category." };
  }

  const scope = scopeForCategory(category)!;

  if (scope === "committee" && !committeeConferenceId) {
    return { error: "Select a committee for this award." };
  }

  const committee_conference_id =
    scope === "committee" ? committeeConferenceId : null;
  const recipient_committee_id =
    scope === "collective_committee" ? recipientCommitteeId || null : null;
  const recipient_profile_id =
    scope === "collective_committee" ? null : recipientProfileId || null;

  const payload = {
    category,
    committee_conference_id,
    recipient_profile_id,
    recipient_committee_id,
    notes: notes || null,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
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

export async function submitChairTopNominationAction(
  formData: FormData
): Promise<SubmitChairNominationResult> {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { ok: false, error: "You must be signed in as a chair, SMT member, or admin." };
  }

  const committeeId = String(formData.get("committee_conference_id") ?? "").trim();
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
  if (!committeeId || !rank || !validNominationType) {
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

  if (!nomineeId) {
    if (nominationType === "committee_honourable_mention") {
      const { error } = await auth.supabase
        .from("award_nominations")
        .delete()
        .eq("committee_conference_id", committeeId)
        .eq("nomination_type", nominationType)
        .eq("rank", rank)
        .eq("status", "pending");
      if (error) return { ok: false, error: error.message };
      revalidatePath("/chair/awards");
      revalidatePath("/smt/awards");
      revalidatePath("/smt");
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
    .eq("conference_id", committeeId)
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
    .eq("conference_id", committeeId)
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
  if (nomineeProfile?.role === "chair") {
    return { ok: false, error: "Nominees must be delegates or country seats, not the committee chair." };
  }

  if (nominationType === "committee_honourable_mention") {
    const { data: allocRows } = await auth.supabase
      .from("allocations")
      .select("user_id")
      .eq("conference_id", committeeId)
      .not("user_id", "is", null);
    const uids = [...new Set((allocRows ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
    let seatedCount = 0;
    if (uids.length > 0) {
      const { data: seatProfiles } = await auth.supabase.from("profiles").select("id, role").in("id", uids);
      seatedCount = (seatProfiles ?? []).filter((p) => p.role !== "chair").length;
    }
    const maxHmRank = seatedCount > 23 ? 3 : 2;
    if (rank > maxHmRank) {
      return { ok: false, error: "This Honourable Mention slot is not used for your committee size." };
    }
  }

  const { data: existing } = await auth.supabase
    .from("award_nominations")
    .select("id")
    .eq("committee_conference_id", committeeId)
    .eq("nomination_type", nominationType)
    .eq("rank", rank)
    .eq("status", "pending")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await auth.supabase
      .from("award_nominations")
      .update({
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
      status: "pending",
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/chair/awards");
  revalidatePath("/smt/awards");
  revalidatePath("/smt");
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

  if (isSingleWinnerNominationType(nomination.nomination_type as NominationRubricType)) {
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
