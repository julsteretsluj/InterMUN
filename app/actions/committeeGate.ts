"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyCommitteePassword, hashCommitteePassword } from "@/lib/committee-password";
import { setVerifiedConferenceId, clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { verifyStaffCommitteeBypassPassword } from "@/lib/staff-committee-bypass";
import { getActiveEventId, setActiveEventId } from "@/lib/active-event-cookie";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";

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

  const ctx = await getConferenceForDashboard({ role: profile?.role });
  if (!ctx || ctx.id !== conferenceId) {
    return {
      error:
        "Your committee context does not match this sign-in. Re-enter your conference and committee codes if needed.",
    };
  }

  const eventId = await getActiveEventId();
  if (profile?.role === "chair" || profile?.role === "smt") {
    if (eventId && ctx.event_id !== eventId) {
      return {
        error:
          "Your conference selection does not match this committee. Re-enter your conference and committee codes.",
      };
    }
    if (!eventId) {
      await setActiveEventId(ctx.event_id);
    }
  } else if (!eventId || ctx.event_id !== eventId) {
    return {
      error:
        "Your conference selection does not match this committee. Go back and enter the correct conference code, then committee code.",
    };
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
    await setActiveConferenceContext(supabase, conference.id);
    redirect(nextPath.startsWith("/") ? nextPath : "/profile");
  }

  if (!verifyCommitteePassword(password, conference.committee_password_hash)) {
    return { error: "Incorrect committee password." };
  }

  await setVerifiedConferenceId(conference.id);
  await setActiveConferenceContext(supabase, conference.id);
  redirect(nextPath.startsWith("/") ? nextPath : "/profile");
}

/** Chairs / SMT: skip allocation + committee password with org secondary password. */
export async function verifyStaffNotDelegateBypass(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const staffPassword = String(formData.get("staff_secondary_password") ?? "");
  const nextPath = String(formData.get("next") ?? "/profile").trim() || "/profile";

  if (!conferenceId || !staffPassword) {
    return { error: "Conference and staff secondary password are required." };
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

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    return { error: "Only chairs and SMT can use staff sign-in." };
  }

  const ctx = await getConferenceForDashboard({ role: profile?.role });
  if (!ctx || ctx.id !== conferenceId) {
    return {
      error:
        "Your committee context does not match this sign-in. Re-enter your conference and committee codes if needed.",
    };
  }

  const eventId = await getActiveEventId();
  if (eventId && ctx.event_id !== eventId) {
    return {
      error:
        "Your conference selection does not match this committee. Re-enter your conference and committee codes.",
    };
  }
  if (!eventId) {
    await setActiveEventId(ctx.event_id);
  }

  if (!verifyStaffCommitteeBypassPassword(staffPassword)) {
    return { error: "Incorrect staff secondary password." };
  }

  await setVerifiedConferenceId(conferenceId);
  await setActiveConferenceContext(supabase, conferenceId);
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
