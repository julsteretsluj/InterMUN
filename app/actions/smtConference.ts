"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  if (profile?.role !== "smt" && profile?.role !== "admin") {
    return { error: "Only secretariat or website admins can edit conference info." };
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
  const committeeCode = String(formData.get("committee_code") ?? "").trim();

  if (!id || name.length < 2 || committeeCode.length < 4) {
    return { error: "Session title and committee code (4+ chars) are required." };
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
  if (profile?.role !== "smt" && profile?.role !== "admin") {
    return { error: "Only secretariat or website admins can edit committees." };
  }

  const { error } = await supabase.rpc("update_committee_session_smt", {
    p_id: id,
    p_name: name,
    p_committee: committee,
    p_tagline: tagline,
    p_committee_code: committeeCode,
  });

  if (error) return { error: error.message };
  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  revalidatePath(`/smt/committees/${id}`);
  return { success: true };
}
