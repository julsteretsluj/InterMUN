"use server";

import { createClient } from "@/lib/supabase/server";
import { AWARD_CATEGORIES, type AwardScope } from "@/lib/awards";

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

  return { success: true };
}

export async function deleteAwardAssignment(id: string): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { error: "Only chairs, SMT, and website admins can delete awards." };
  }
  const { error } = await auth.supabase.from("award_assignments").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
