"use server";

import { createClient } from "@/lib/supabase/server";
import { hashCommitteePassword } from "@/lib/committee-password";
import { clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { normalizeCommitteeCode, normalizeEventCode } from "@/lib/join-codes";
import { isValidCommitteeJoinCode } from "@/lib/committee-join-code";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { redirect } from "next/navigation";
import { canCreateConferenceEvent } from "@/lib/roles";

export type ConferenceSetupState = { error?: string };

export async function createConferenceAsStaff(
  _prev: ConferenceSetupState | null,
  formData: FormData
): Promise<ConferenceSetupState> {
  const eventName = String(formData.get("event_name") ?? "").trim();
  const eventCode = normalizeEventCode(String(formData.get("event_code") ?? ""));
  const sessionName = String(formData.get("session_name") ?? "").trim();
  const committee = String(formData.get("committee") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const committeeCode = normalizeCommitteeCode(String(formData.get("committee_code") ?? ""));
  const password = String(formData.get("committee_password") ?? "");
  const confirm = String(formData.get("committee_password_confirm") ?? "");
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : "/profile";

  if (eventName.length < 2) {
    return { error: "Enter a conference / event name (at least 2 characters)." };
  }
  if (eventCode.length < 4) {
    return { error: "Conference code must be at least 4 characters (spaces ignored)." };
  }
  if (sessionName.length < 2) {
    return { error: "Enter a committee session title (at least 2 characters)." };
  }
  if (!isValidCommitteeJoinCode(committeeCode)) {
    return { error: "Committee code must be exactly 6 letters or digits (e.g. ECO741 from chamber initials + 3 digits)." };
  }
  if (password && password.length < 6) {
    return { error: "Committee password must be at least 6 characters, or leave both password fields empty." };
  }
  if (password !== confirm) {
    return { error: "Committee password and confirmation do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canCreateConferenceEvent(profile?.role)) {
    return { error: "Only secretariat or website admins can create a new conference event." };
  }

  const { data: newId, error: createErr } = await supabase.rpc("create_event_and_committee_as_staff", {
    p_event_name: eventName,
    p_event_code: eventCode,
    p_session_name: sessionName,
    p_committee: committee,
    p_tagline: tagline,
    p_committee_code: committeeCode,
  });

  if (createErr || !newId) {
    return { error: createErr?.message ?? "Could not create conference." };
  }

  const conferenceId = String(newId);

  if (password) {
    const hash = hashCommitteePassword(password);
    const { error: hashErr } = await supabase.rpc("set_committee_password_hash", {
      conference_id: conferenceId,
      new_hash: hash,
    });
    if (hashErr) {
      return {
        error: `Conference was created but committee password could not be set: ${hashErr.message}`,
      };
    }
  }

  await setActiveConferenceContext(supabase, conferenceId);
  await clearVerifiedConference();
  redirect(nextPath);
}
