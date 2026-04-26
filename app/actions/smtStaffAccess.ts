"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { getServerAppOrigin } from "@/lib/app-origin";
import { normalizeCommitteeCode } from "@/lib/join-codes";
import { isValidCommitteeJoinCode } from "@/lib/committee-join-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";

export type StaffAccessFormState = { error?: string; success?: string };

async function requireSmtForConference(conferenceId: string) {
  const t = await getTranslations("serverActions.smtStaffAccess");
  const eventId = await getActiveEventId();
  if (!eventId) {
    return { error: t("chooseEventFirst"), supabase: null as null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn"), supabase: null as null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") {
    return { error: t("onlySmtChangeCodes"), supabase: null as null };
  }

  const { data: conf } = await supabase
    .from("conferences")
    .select("id")
    .eq("id", conferenceId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!conf) {
    return { error: t("committeeNotInActiveEvent"), supabase: null as null };
  }

  return { supabase, error: undefined as undefined };
}

export async function smtSetCommitteeCodeOnlyAction(
  _prev: StaffAccessFormState | null,
  formData: FormData
): Promise<StaffAccessFormState> {
  const t = await getTranslations("serverActions.smtStaffAccess");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const code = normalizeCommitteeCode(String(formData.get("code") ?? ""));

  if (!conferenceId) {
    return { error: t("missingCommittee") };
  }
  if (!isValidCommitteeJoinCode(code)) {
    return { error: t("invalidCommitteeCode") };
  }

  const auth = await requireSmtForConference(conferenceId);
  if (auth.error || !auth.supabase) {
    return { error: auth.error ?? t("unauthorized") };
  }

  const { error } = await auth.supabase.rpc("set_conference_room_code", {
    p_conference_id: conferenceId,
    p_room_code: code,
  });

  if (error) return { error: error.message };

  revalidatePath("/smt/room-codes");
  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  return { success: t("codeSaved") };
}

function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  return e.length >= 5 && e.includes("@") && !e.includes(" ");
}

export async function smtInviteChairAction(
  _prev: StaffAccessFormState | null,
  formData: FormData
): Promise<StaffAccessFormState> {
  const t = await getTranslations("serverActions.smtStaffAccess");
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: t("invalidEmail") };
  }

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
  if (profile?.role !== "smt") {
    return { error: t("onlySmtInviteChair") };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error: t("missingServiceRoleKey"),
    };
  }

  const origin = getServerAppOrigin();
  if (!origin) {
    return {
      error: t("missingPublicAppUrl"),
    };
  }

  const redirectTo = `${origin}/login`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error: t("emailAlreadyHasAccount"),
      };
    }
    return { error: error.message };
  }

  const newId = data?.user?.id;
  if (newId) {
    const { error: profileErr } = await admin.from("profiles").update({ role: "chair" }).eq("id", newId);
    if (profileErr) {
      return {
        error: t("inviteSentButRoleSetFailed", { error: profileErr.message }),
      };
    }
  }

  revalidatePath("/smt/room-codes");
  return { success: t("inviteSentSuccess", { email }) };
}

export async function smtPromoteToChairByEmailAction(
  _prev: StaffAccessFormState | null,
  formData: FormData
): Promise<StaffAccessFormState> {
  const t = await getTranslations("serverActions.smtStaffAccess");
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: t("invalidEmail") };
  }

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
  if (profile?.role !== "smt") {
    return { error: t("onlySmtGrantChair") };
  }

  const { error } = await supabase.rpc("smt_promote_to_chair_by_email", { p_email: email });
  if (error) {
    const em = error.message ?? "";
    if (em.includes("no user")) {
      return { error: t("noAccountForEmail") };
    }
    return { error: em };
  }

  revalidatePath("/smt/room-codes");
  return { success: t("promotedToChairSuccess", { email }) };
}
