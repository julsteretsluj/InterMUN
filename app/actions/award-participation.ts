"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type ParticipationScope,
  rubricKeysForParticipationScope,
  isRubricScoresComplete,
} from "@/lib/award-participation-scoring";
import { resolveCanonicalCommitteeConferenceId } from "@/lib/conference-committee-canonical";
import { revalidatePath } from "next/cache";

function parseScoresFromForm(formData: FormData, keys: string[]): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const key of keys) {
    const raw = String(formData.get(`score_${key}`) ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= 8) {
      out[key] = n;
      continue;
    }
    return null;
  }
  return out;
}

/** Save or update one participation evaluation row (chair delegate matrix or SMT chair/report). */
export async function saveAwardParticipationScore(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const scope = String(formData.get("scope") ?? "").trim() as ParticipationScope;
  if (!["delegate_by_chair", "chair_by_smt", "chair_report_by_smt", "chair_by_delegate"].includes(scope)) {
    return { error: "Invalid scope." };
  }

  let committeeConferenceId = String(formData.get("committee_conference_id") ?? "").trim();
  if (!committeeConferenceId) return { error: "Missing committee." };

  if (scope === "chair_report_by_smt") {
    committeeConferenceId = await resolveCanonicalCommitteeConferenceId(supabase, committeeConferenceId);
  }

  const subjectProfileIdRaw = String(formData.get("subject_profile_id") ?? "").trim();
  const subject_profile_id =
    scope === "chair_report_by_smt" ? null : subjectProfileIdRaw || null;
  if (scope !== "chair_report_by_smt" && !subject_profile_id) {
    return { error: "Missing subject profile." };
  }

  const keys = rubricKeysForParticipationScope(scope);
  const rubric_scores = parseScoresFromForm(formData, keys);
  if (!rubric_scores) {
    return { error: "Pick a band and low/high for every criterion." };
  }
  if (!isRubricScoresComplete(rubric_scores, keys)) {
    return { error: "Every criterion must be scored 1–8." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();

  if (scope === "delegate_by_chair") {
    if (role !== "chair") return { error: "Only chairs can save delegate evaluations." };
  } else if (scope === "chair_by_delegate") {
    if (role !== "delegate") return { error: "Only delegates can submit chair feedback." };
  } else {
    if (role !== "smt" && role !== "admin") return { error: "Only SMT can save chair / chair report evaluations." };
  }

  const now = new Date().toISOString();
  const insertPayload = {
    scope,
    committee_conference_id: committeeConferenceId,
    subject_profile_id,
    rubric_scores,
    created_by: user.id,
    updated_at: now,
  };

  let existingId: string | null = null;
  if (scope === "chair_report_by_smt") {
    const { data } = await supabase
      .from("award_participation_scores")
      .select("id")
      .eq("scope", scope)
      .eq("committee_conference_id", committeeConferenceId)
      .is("subject_profile_id", null)
      .maybeSingle();
    existingId = data?.id ?? null;
  } else if (scope === "chair_by_delegate") {
    const { data } = await supabase
      .from("award_participation_scores")
      .select("id")
      .eq("scope", scope)
      .eq("committee_conference_id", committeeConferenceId)
      .eq("subject_profile_id", subject_profile_id!)
      .eq("created_by", user.id)
      .maybeSingle();
    existingId = data?.id ?? null;
  } else {
    const { data } = await supabase
      .from("award_participation_scores")
      .select("id")
      .eq("scope", scope)
      .eq("committee_conference_id", committeeConferenceId)
      .eq("subject_profile_id", subject_profile_id!)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { error } = await supabase
      .from("award_participation_scores")
      .update({ rubric_scores, updated_at: now })
      .eq("id", existingId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("award_participation_scores").insert(insertPayload);
    if (error) return { error: error.message };
  }

  revalidatePath("/chair/awards");
  revalidatePath("/smt/awards");
  revalidatePath("/delegate/chair-feedback");
  return { success: true };
}
