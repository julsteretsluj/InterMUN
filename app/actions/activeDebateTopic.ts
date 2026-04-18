"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getResolvedActiveConference } from "@/lib/active-conference";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { getCommitteeAwardScope } from "@/lib/conference-committee-canonical";

export async function setActiveDebateTopicAction(topicConferenceId: string): Promise<{ error?: string }> {
  const id = String(topicConferenceId ?? "").trim();
  if (!id) return { error: "Choose a topic." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    return { error: "Only chairs can change the live debate topic." };
  }

  const active = await getResolvedActiveConference();
  if (!active) return { error: "No active committee." };

  const scope = await getCommitteeAwardScope(supabase, active.id);
  if (!scope.siblingConferenceIds.includes(id)) {
    return { error: "That topic is not part of this committee." };
  }

  const { error } = await supabase.from("committee_synced_state").upsert(
    {
      conference_id: scope.canonicalConferenceId,
      state_key: COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC,
      payload: { topic_conference_id: id },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conference_id,state_key" }
  );

  if (error) return { error: error.message };

  revalidatePath("/chair/session");
  revalidatePath("/chair/session/motions");
  revalidatePath("/chair/session/timer");
  revalidatePath("/chair/session/speakers");
  revalidatePath("/chair/session/roll-call");
  revalidatePath("/chair/session/announcements");
  revalidatePath("/delegate");
  revalidatePath("/committee-room");

  return {};
}
