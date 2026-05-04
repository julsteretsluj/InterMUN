"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidCommitteeJoinCode } from "@/lib/committee-join-code";
import { normalizeCommitteeCode } from "@/lib/join-codes";
import { revalidatePath } from "next/cache";
import { ensureDaisSeatAllocations } from "@/lib/ensure-dais-seat-allocations";
import { committeeHintForSmtDaisPlan } from "@/lib/smt-conference-filters";

export type SmtFormState = { error?: string; success?: boolean };

export async function updateConferenceEventAction(
  _prev: SmtFormState | null,
  formData: FormData
): Promise<SmtFormState> {
  const id = String(formData.get("event_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const eventCode = String(formData.get("event_code") ?? "").trim();

  if (!id || name.length < 2 || eventCode.length < 4) {
    return { error: "Event name (2+ chars) and conference code (4+ chars) are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") {
    return { error: "Only secretariat can edit conference info." };
  }

  const { error } = await supabase.rpc("update_conference_event_smt", {
    p_id: id,
    p_name: name,
    p_tagline: tagline,
    p_event_code: eventCode,
  });

  if (error) return { error: error.message };
  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  return { success: true };
}

export async function updateCommitteeSessionAction(
  _prev: SmtFormState | null,
  formData: FormData
): Promise<SmtFormState> {
  const id = String(formData.get("conference_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const committee = String(formData.get("committee") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const committeeCode = normalizeCommitteeCode(String(formData.get("committee_code") ?? ""));
  const committeeFullName = String(formData.get("committee_full_name") ?? "").trim();
  const chairNames = String(formData.get("chair_names") ?? "").trim();
  const crisisSlidesUrl = String(formData.get("crisis_slides_url") ?? "").trim();
  const consultationBeforeModerated = formData.get("consultation_before_moderated_caucus") === "on";
  const procedureProfileRaw = String(formData.get("procedure_profile") ?? "default").trim().toLowerCase();
  const procedureProfile = procedureProfileRaw === "eu_parliament" ? "eu_parliament" : "default";
  const euGuidedWorkflowEnabled = formData.get("eu_guided_workflow_enabled") === "on";

  if (!id || name.length < 2 || !isValidCommitteeJoinCode(committeeCode)) {
    return { error: "Session title and a valid 6-character committee code (letters/digits) are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") {
    return { error: "Only secretariat can edit committees." };
  }

  const { error } = await supabase.rpc("update_committee_session_smt", {
    p_id: id,
    p_name: name,
    p_committee: committee,
    p_tagline: tagline,
    p_committee_code: committeeCode,
    p_committee_full_name: committeeFullName,
    p_chair_names: chairNames,
    p_crisis_slides_url: crisisSlidesUrl,
    p_consultation_before_moderated_caucus: consultationBeforeModerated,
    p_procedure_profile: procedureProfile,
    p_eu_guided_workflow_enabled: euGuidedWorkflowEnabled,
  });

  if (error) return { error: error.message };
  await ensureDaisSeatAllocations(
    supabase,
    id,
    committeeHintForSmtDaisPlan({ committee, committee_code: committeeCode })
  );
  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  revalidatePath(`/smt/committees/${id}`);
  revalidatePath("/crisis-slides");
  return { success: true };
}

export async function updateChamberCommitteeProfileAction(
  _prev: SmtFormState | null,
  formData: FormData
): Promise<SmtFormState> {
  const anchorId = String(formData.get("anchor_conference_id") ?? "").trim();
  const committee = String(formData.get("committee") ?? "").trim();
  const committeeFullName = String(formData.get("committee_full_name") ?? "").trim();
  const topic1 = String(formData.get("topic_1") ?? "").trim();
  const topic2 = String(formData.get("topic_2") ?? "").trim();
  const ropDocumentUrl = String(formData.get("rop_document_url") ?? "").trim();
  const committeeCode = normalizeCommitteeCode(String(formData.get("room_code") ?? ""));
  const procedureProfileRaw = String(formData.get("procedure_profile") ?? "default").trim().toLowerCase();
  const procedureProfile = procedureProfileRaw === "eu_parliament" ? "eu_parliament" : "default";

  if (!anchorId || !isValidCommitteeJoinCode(committeeCode)) {
    return { error: "Committee label and a valid 6-character room code (letters/digits) are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "smt" && role !== "admin") {
    return { error: "Only secretariat can edit committees." };
  }

  const euGuided = procedureProfile === "eu_parliament";

  const { error } = await supabase.rpc("update_chamber_committee_profile_smt", {
    p_anchor_id: anchorId,
    p_committee: committee,
    p_committee_full_name: committeeFullName,
    p_topic1: topic1,
    p_topic2: topic2,
    p_rop_document_url: ropDocumentUrl,
    p_committee_code: committeeCode,
    p_procedure_profile: procedureProfile,
    p_consultation_before_moderated_caucus: true,
    p_eu_guided_workflow_enabled: euGuided,
  });

  if (error) return { error: error.message };

  await ensureDaisSeatAllocations(
    supabase,
    anchorId,
    committeeHintForSmtDaisPlan({ committee, committee_code: committeeCode })
  );

  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  revalidatePath("/chair");
  return { success: true };
}

export async function addChamberSecondTopicAction(anchorId: string): Promise<{ error?: string; newId?: string }> {
  const id = anchorId.trim();
  if (!id) return { error: "Missing committee." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "smt" && role !== "admin") {
    return { error: "Only secretariat can add topics." };
  }

  const { data: newId, error } = await supabase.rpc("add_chamber_second_topic_smt", {
    p_anchor_id: id,
  });

  if (error) return { error: error.message };
  if (!newId || typeof newId !== "string") return { error: "Could not create topic row." };

  const { data: hintRow } = await supabase
    .from("conferences")
    .select("committee, committee_code")
    .eq("id", id)
    .maybeSingle();
  await ensureDaisSeatAllocations(
    supabase,
    newId,
    hintRow ? committeeHintForSmtDaisPlan(hintRow) : null
  );

  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  revalidatePath("/chair");
  return { newId };
}
