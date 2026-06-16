"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAdvisorAssignmentForDelegateUser } from "@/lib/advisor-access";
import { isAdvisorRole } from "@/lib/roles";
import type { NoteTopic } from "@/lib/delegation-notes-bundle";
import { getTranslations } from "next-intl/server";

const NOTE_TOPICS = new Set<NoteTopic>([
  "bloc forming",
  "speech pois or pocs",
  "questions",
  "informal conversations",
]);

export type AdvisorNoteFormState = { error?: string; success?: string };

export async function sendAdvisorDelegateNoteAction(
  _prev: AdvisorNoteFormState,
  formData: FormData
): Promise<AdvisorNoteFormState> {
  const t = await getTranslations("advisorDashboard.sendNote");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn") };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isAdvisorRole(profile?.role)) return { error: t("notAdvisor") };

  const delegateUserId = String(formData.get("delegateUserId") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim() as NoteTopic;
  const content = String(formData.get("content") ?? "").trim();

  if (!delegateUserId) return { error: t("missingDelegate") };
  if (!NOTE_TOPICS.has(topic)) return { error: t("invalidTopic") };
  if (!content) return { error: t("emptyContent") };

  const assignment = await fetchAdvisorAssignmentForDelegateUser(supabase, user.id, delegateUserId);
  if (!assignment?.delegate_allocation_id) {
    return { error: t("notAssigned") };
  }
  if (!assignment.delegate_user_id) {
    return { error: t("delegateNotLinked") };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("delegation_notes")
    .insert({
      conference_id: assignment.conference_id,
      topic,
      content,
      concern_flag: false,
      sender_profile_id: user.id,
      sender_allocation_id: null,
    })
    .select("id, moderation_state")
    .single();

  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? t("sendFailed") };
  }

  const { error: recipErr } = await supabase.from("delegation_note_recipients").insert({
    note_id: inserted.id,
    recipient_kind: "allocation",
    recipient_allocation_id: assignment.delegate_allocation_id,
    recipient_profile_id: null,
  });

  if (recipErr) {
    return { error: recipErr.message ?? t("sendFailed") };
  }

  revalidatePath("/advisor/notes");
  revalidatePath(`/advisor/delegates/${delegateUserId}/notes`);

  if (inserted.moderation_state === "held") {
    return { success: t("heldSuccess") };
  }
  return { success: t("sentSuccess") };
}
