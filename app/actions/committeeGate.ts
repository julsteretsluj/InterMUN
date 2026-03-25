"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyCommitteePassword, hashCommitteePassword } from "@/lib/committee-password";
import { setVerifiedConferenceId, clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { getActiveConferenceId } from "@/lib/active-conference-cookie";

export async function clearCommitteeVerification() {
  await clearVerifiedConference();
}

export async function verifyCommitteeSecondaryLogin(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const allocation = String(formData.get("allocation") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/profile").trim() || "/profile";

  if (!conferenceId || !allocation || !password) {
    return { error: "Conference, allocation, and password are required." };
  }

  const active = await getActiveConferenceId();
  if (active !== conferenceId) {
    return {
      error:
        "Your selected committee does not match your room code. Re-enter your room code on the join page.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: conference, error: cErr } = await supabase
    .from("conferences")
    .select("id, committee_password_hash")
    .eq("id", conferenceId)
    .maybeSingle();

  if (cErr || !conference) {
    return { error: "Conference not found." };
  }

  const { data: allocs, error: aErr } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", conferenceId)
    .eq("user_id", user.id);

  if (aErr || !allocs?.length) {
    return {
      error:
        "You have no allocation for this conference. Ask a chair to assign you before continuing.",
    };
  }

  const norm = (s: string) => s.trim().toLowerCase();
  const match = allocs.find((a) => norm(a.country) === norm(allocation));
  if (!match) {
    return {
      error:
        "Allocation does not match your assignment. Enter your country or position exactly as assigned (spacing and accents may differ).",
    };
  }

  if (!conference.committee_password_hash) {
    await setVerifiedConferenceId(conference.id);
    redirect(nextPath.startsWith("/") ? nextPath : "/profile");
  }

  if (!verifyCommitteePassword(password, conference.committee_password_hash)) {
    return { error: "Incorrect committee password." };
  }

  await setVerifiedConferenceId(conference.id);
  redirect(nextPath.startsWith("/") ? nextPath : "/profile");
}

export type CommitteePasswordFormState = { error?: string; success?: boolean };

export async function setCommitteePasswordAction(
  _prev: CommitteePasswordFormState | null,
  formData: FormData
): Promise<CommitteePasswordFormState> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!conferenceId) {
    return { error: "Choose a conference." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
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
    return { error: "Only chairs and SMT can set the committee password." };
  }

  const hash = hashCommitteePassword(password);
  const { error } = await supabase.rpc("set_committee_password_hash", {
    conference_id: conferenceId,
    new_hash: hash,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function removeCommitteePasswordAction(
  _prev: CommitteePasswordFormState | null,
  formData: FormData
): Promise<CommitteePasswordFormState> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  if (!conferenceId) return { error: "Choose a conference." };

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

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    return { error: "Only chairs and SMT can remove the committee password." };
  }

  const { error } = await supabase.rpc("set_committee_password_hash", {
    conference_id: conferenceId,
    new_hash: null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
