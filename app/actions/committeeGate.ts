"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyCommitteePassword, hashCommitteePassword } from "@/lib/committee-password";
import { setVerifiedConferenceId, clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { clearAllocationCodeVerification } from "@/lib/allocation-code-gate-cookie";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { verifyStaffCommitteeBypassPassword } from "@/lib/staff-committee-bypass";
import { getActiveEventId, setActiveEventId } from "@/lib/active-event-cookie";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { getTranslations } from "next-intl/server";

export async function clearCommitteeVerification() {
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
}

export async function verifyCommitteeSecondaryLogin(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const t = await getTranslations("serverActions.committeeGate");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const allocation = String(formData.get("allocation") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/profile").trim() || "/profile";

  if (!conferenceId || !allocation || !password) {
    return { error: t("requiredConferenceAllocationPassword") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t("mustBeSignedIn") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const ctx = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!ctx || ctx.id !== conferenceId) {
    return {
      error:
        t("contextMismatch"),
    };
  }

  const eventId = await getActiveEventId();
  if (profile?.role === "chair" || profile?.role === "smt" || profile?.role === "admin") {
    if (eventId && ctx.event_id !== eventId) {
      return {
        error:
        t("conferenceSelectionMismatch"),
      };
    }
    if (!eventId) {
      await setActiveEventId(ctx.event_id);
    }
  } else if (!eventId || ctx.event_id !== eventId) {
    return {
      error:
        t("conferenceSelectionMismatchWithBackHint"),
    };
  }

  const { data: conference, error: cErr } = await supabase
    .from("conferences")
    .select("id, committee_password_hash")
    .eq("id", conferenceId)
    .maybeSingle();

  if (cErr || !conference) {
    return { error: t("conferenceNotFound") };
  }

  const { data: allocs, error: aErr } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", conferenceId)
    .eq("user_id", user.id);

  if (aErr || !allocs?.length) {
    return {
      error:
        t("noAllocationForConference"),
    };
  }

  const norm = (s: string) => s.trim().toLowerCase();
  const match = allocs.find((a) => norm(a.country) === norm(allocation));
  if (!match) {
    return {
      error:
        t("allocationMismatch"),
    };
  }

  if (!conference.committee_password_hash) {
    await setVerifiedConferenceId(conference.id);
    await setActiveConferenceContext(supabase, conference.id);
    redirect(nextPath.startsWith("/") ? nextPath : "/profile");
  }

  if (!verifyCommitteePassword(password, conference.committee_password_hash)) {
    return { error: t("incorrectCommitteePassword") };
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
  const t = await getTranslations("serverActions.committeeGate");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const staffPassword = String(formData.get("staff_secondary_password") ?? "");
  const nextPath = String(formData.get("next") ?? "/profile").trim() || "/profile";

  if (!conferenceId || !staffPassword) {
    return { error: t("requiredConferenceAndStaffPassword") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t("mustBeSignedIn") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "smt" && profile?.role !== "admin") {
    return { error: t("onlySmtOrAdminBypass") };
  }

  const ctx = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!ctx || ctx.id !== conferenceId) {
    return {
      error:
        t("contextMismatch"),
    };
  }

  const eventId = await getActiveEventId();
  if (eventId && ctx.event_id !== eventId) {
    return {
      error:
        t("conferenceSelectionMismatch"),
    };
  }
  if (!eventId) {
    await setActiveEventId(ctx.event_id);
  }

  if (!verifyStaffCommitteeBypassPassword(staffPassword)) {
    return { error: t("incorrectStaffPassword") };
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
  const t = await getTranslations("serverActions.committeeGate");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!conferenceId) {
    return { error: t("chooseConference") };
  }
  if (password.length < 6) {
    return { error: t("passwordMinLength") };
  }
  if (password !== confirm) {
    return { error: t("passwordsDoNotMatch") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t("notSignedIn") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    return { error: t("onlyChairSmtAdminSetPassword") };
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
  const t = await getTranslations("serverActions.committeeGate");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  if (!conferenceId) return { error: t("chooseConference") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    return { error: t("onlyChairSmtAdminRemovePassword") };
  }

  const { error } = await supabase.rpc("set_committee_password_hash", {
    conference_id: conferenceId,
    new_hash: null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
