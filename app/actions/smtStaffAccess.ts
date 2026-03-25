"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { getServerAppOrigin } from "@/lib/app-origin";
import { normalizeCommitteeCode } from "@/lib/join-codes";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffAccessFormState = { error?: string; success?: string };

async function requireSmtForConference(conferenceId: string) {
  const eventId = await getActiveEventId();
  if (!eventId) {
    return { error: "Choose an event with the conference code (event gate) first.", supabase: null as null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase: null as null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") {
    return { error: "Only secretariat can change committee codes here.", supabase: null as null };
  }

  const { data: conf } = await supabase
    .from("conferences")
    .select("id")
    .eq("id", conferenceId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!conf) {
    return { error: "This committee is not part of your active event.", supabase: null as null };
  }

  return { supabase, error: undefined as undefined };
}

export async function smtSetCommitteeCodeOnlyAction(
  _prev: StaffAccessFormState | null,
  formData: FormData
): Promise<StaffAccessFormState> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const code = normalizeCommitteeCode(String(formData.get("code") ?? ""));

  if (!conferenceId) {
    return { error: "Missing committee." };
  }
  if (code.length < 4) {
    return { error: "Committee / room code must be at least 4 characters." };
  }

  const auth = await requireSmtForConference(conferenceId);
  if (auth.error || !auth.supabase) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const { error } = await auth.supabase.rpc("set_conference_room_code", {
    p_conference_id: conferenceId,
    p_room_code: code,
  });

  if (error) return { error: error.message };

  revalidatePath("/smt/room-codes");
  revalidatePath("/smt");
  revalidatePath("/smt/conference");
  return { success: "Code saved. Delegates use it as the second gate after the conference code." };
}

function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  return e.length >= 5 && e.includes("@") && !e.includes(" ");
}

export async function smtInviteChairAction(
  _prev: StaffAccessFormState | null,
  formData: FormData
): Promise<StaffAccessFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

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
  if (profile?.role !== "smt") {
    return { error: "Only secretariat can send chair invites." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to the deployment env (never expose to the browser).",
    };
  }

  const origin = getServerAppOrigin();
  if (!origin) {
    return {
      error:
        "Set NEXT_PUBLIC_APP_URL to your public site URL (e.g. https://your-app.vercel.app) so invite links redirect correctly.",
    };
  }

  const redirectTo = `${origin}/login`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error:
          "That email already has an account. Use “Grant chair role” below instead of sending another invite.",
      };
    }
    return { error: error.message };
  }

  const newId = data?.user?.id;
  if (newId) {
    const { error: profileErr } = await admin.from("profiles").update({ role: "chair" }).eq("id", newId);
    if (profileErr) {
      return {
        error: `Invite sent, but could not set chair role on profile: ${profileErr.message}. Use “Grant chair role” after they accept.`,
      };
    }
  }

  revalidatePath("/smt/room-codes");
  return { success: `Invite email sent to ${email}. They will be a chair after they set their password.` };
}

export async function smtPromoteToChairByEmailAction(
  _prev: StaffAccessFormState | null,
  formData: FormData
): Promise<StaffAccessFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

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
  if (profile?.role !== "smt") {
    return { error: "Only secretariat can grant chair roles." };
  }

  const { error } = await supabase.rpc("smt_promote_to_chair_by_email", { p_email: email });
  if (error) {
    const em = error.message ?? "";
    if (em.includes("no user")) {
      return { error: "No account with that email yet. Send a chair invite first." };
    }
    return { error: em };
  }

  revalidatePath("/smt/room-codes");
  return { success: `Profile for ${email} is now a dais chair.` };
}
