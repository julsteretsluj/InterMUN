"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getServerAppOrigin } from "@/lib/app-origin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserFormState = { error?: string; success?: string };

function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  return e.length >= 5 && e.includes("@") && !e.includes(" ");
}

async function requireWebsiteAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, ok: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { supabase, user, ok: false as const };
  }
  return { supabase, user, ok: true as const };
}

export async function adminInviteSmtAction(
  _prev: AdminUserFormState | null,
  formData: FormData
): Promise<AdminUserFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const auth = await requireWebsiteAdmin();
  if (!auth.ok || !auth.user) {
    return { error: "Only website admins can invite SMT members." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to the deployment env (server only).",
    };
  }

  const origin = getServerAppOrigin();
  if (!origin) {
    return {
      error:
        "Set NEXT_PUBLIC_APP_URL to your public site URL so invite links redirect correctly.",
    };
  }

  const redirectTo = `${origin}/login`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error:
          "That email already has an account. Use “Set role” below to make them SMT instead of sending another invite.",
      };
    }
    return { error: error.message };
  }

  const newId = data?.user?.id;
  if (newId) {
    const { error: profileErr } = await admin.from("profiles").update({ role: "smt" }).eq("id", newId);
    if (profileErr) {
      return {
        error: `Invite sent, but could not set SMT role: ${profileErr.message}. Use “Set role” after they accept.`,
      };
    }
  }

  revalidatePath("/admin");
  return { success: `Invite sent to ${email}. They will be secretariat (SMT) after they set their password.` };
}

const ASSIGNABLE_ROLES = ["delegate", "chair", "smt"] as const;

export async function adminSetProfileRoleAction(
  _prev: AdminUserFormState | null,
  formData: FormData
): Promise<AdminUserFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!ASSIGNABLE_ROLES.includes(roleRaw as (typeof ASSIGNABLE_ROLES)[number])) {
    return { error: "Choose delegate, chair, or SMT." };
  }

  const auth = await requireWebsiteAdmin();
  if (!auth.ok || !auth.user) {
    return { error: "Only website admins can change user roles." };
  }

  const { error } = await auth.supabase.rpc("admin_set_profile_role_by_email", {
    p_email: email,
    p_role: roleRaw,
  });

  if (error) {
    const em = error.message ?? "";
    if (em.includes("no user")) {
      return { error: "No account with that email yet. Send an invite first." };
    }
    if (em.includes("your own role")) {
      return { error: "You cannot change your own role from here." };
    }
    return { error: em };
  }

  revalidatePath("/admin");
  revalidatePath("/smt");
  return { success: `Updated ${email} to ${roleRaw}.` };
}
