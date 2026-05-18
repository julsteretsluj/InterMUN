"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getServerAppOrigin } from "@/lib/app-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";

export type AdvisorStaffFormState = { error?: string; success?: string };

function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  return e.length >= 5 && e.includes("@") && !e.includes(" ");
}

async function findAuthUserIdByEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const hit = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === target);
  return hit?.id ?? null;
}

async function requireSmt() {
  const t = await getTranslations("serverActions.advisorStaff");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn"), supabase: null as null, userId: null as null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "smt" && profile?.role !== "admin") {
    return { error: t("onlySmt"), supabase: null as null, userId: null as null };
  }

  return { supabase, error: undefined as undefined, userId: user.id };
}

export async function smtInviteAdvisorAction(
  _prev: AdvisorStaffFormState | null,
  formData: FormData
): Promise<AdvisorStaffFormState> {
  const t = await getTranslations("serverActions.advisorStaff");
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: t("invalidEmail") };
  }

  const auth = await requireSmt();
  if (auth.error || !auth.supabase) return { error: auth.error ?? t("unauthorized") };

  const admin = createAdminClient();
  if (!admin) {
    return { error: t("missingServiceRole") };
  }

  const origin = getServerAppOrigin();
  if (!origin) {
    return { error: t("missingAppUrl") };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/login`,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return { error: t("emailAlreadyRegistered") };
    }
    return { error: error.message };
  }

  const newId = data?.user?.id;
  if (newId) {
    const { error: profileErr } = await admin.from("profiles").update({ role: "advisor" }).eq("id", newId);
    if (profileErr) {
      return { error: t("inviteRoleFailed", { message: profileErr.message }) };
    }
  }

  revalidatePath("/smt/room-codes");
  revalidatePath("/smt/advisors");
  return { success: t("inviteSent", { email }) };
}

export async function smtAssignAdvisorDelegateAction(
  _prev: AdvisorStaffFormState | null,
  formData: FormData
): Promise<AdvisorStaffFormState> {
  const t = await getTranslations("serverActions.advisorStaff");
  const advisorEmail = String(formData.get("advisor_email") ?? "").trim();
  const allocationId = String(formData.get("delegate_allocation_id") ?? "").trim();

  if (!isValidEmail(advisorEmail)) return { error: t("invalidAdvisorEmail") };
  if (!allocationId) return { error: t("missingDelegate") };

  const auth = await requireSmt();
  if (auth.error || !auth.supabase) return { error: auth.error ?? t("unauthorized") };

  const admin = createAdminClient();
  if (!admin) return { error: t("missingServiceRole") };

  const advisorId = await findAuthUserIdByEmail(admin, advisorEmail);
  if (!advisorId) return { error: t("advisorNotFound") };

  const { data: advisorProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", advisorId)
    .maybeSingle();
  if (advisorProfile?.role !== "advisor") {
    return { error: t("notAdvisorRole") };
  }

  const { data: alloc } = await auth.supabase
    .from("allocations")
    .select("id, conference_id, user_id, country")
    .eq("id", allocationId)
    .maybeSingle();
  if (!alloc?.conference_id) return { error: t("delegateNotFound") };
  if (!alloc.user_id) return { error: t("delegateUnlinked") };

  const { error: upsertErr } = await admin.from("advisor_delegate_assignments").upsert(
    {
      advisor_profile_id: advisorId,
      delegate_allocation_id: alloc.id,
      conference_id: alloc.conference_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "delegate_allocation_id" }
  );

  if (upsertErr) return { error: upsertErr.message };

  revalidatePath("/smt/advisors");
  revalidatePath("/smt/room-codes");
  return { success: t("assigned", { country: alloc.country }) };
}

async function requireStaffForForward() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null as null, error: "Not signed in." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role?.toString().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    return { supabase: null as null, error: "Only chair or SMT can forward notes." };
  }
  return { supabase, error: undefined as undefined };
}

export async function forwardDelegationNoteToAdvisorAction(
  noteId: string,
  advisorProfileId: string
): Promise<{ error?: string }> {
  const auth = await requireStaffForForward();
  if (auth.error || !auth.supabase) return { error: auth.error };
  const supabase = auth.supabase;
  const { error } = await supabase.rpc("forward_delegation_note_to_advisor", {
    p_note_id: noteId,
    p_advisor_profile_id: advisorProfileId,
  });
  if (error) return { error: error.message };
  revalidatePath("/chats-notes");
  revalidatePath("/advisor/notes");
  return {};
}
