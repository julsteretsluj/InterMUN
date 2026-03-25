"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  setActiveConferenceId,
  clearActiveConference,
} from "@/lib/active-conference-cookie";
import { clearVerifiedConference } from "@/lib/committee-gate-cookie";

function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function clearRoomAndCommitteeContext() {
  await clearActiveConference();
  await clearVerifiedConference();
}

export async function joinRoomByCode(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const code = normalizeRoomCode(String(formData.get("code") ?? ""));
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  if (code.length < 4) {
    return { error: "Enter the room code from your chair (at least 4 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: conference, error } = await supabase
    .from("conferences")
    .select("id")
    .eq("room_code", code)
    .maybeSingle();

  if (error || !conference) {
    return { error: "No committee matches that code. Check with your chair." };
  }

  await setActiveConferenceId(conference.id);
  await clearVerifiedConference();
  redirect(nextPath);
}

export async function setRoomCodeAndEnterAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const code = normalizeRoomCode(String(formData.get("code") ?? ""));
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  if (!conferenceId) {
    return { error: "Choose a conference." };
  }
  if (code.length < 4) {
    return { error: "Room code must be at least 4 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    return { error: "Only chairs and SMT can set room codes." };
  }

  const { error } = await supabase.rpc("set_conference_room_code", {
    p_conference_id: conferenceId,
    p_room_code: code,
  });

  if (error) {
    return { error: error.message };
  }

  await setActiveConferenceId(conferenceId);
  await clearVerifiedConference();
  redirect(nextPath);
}
