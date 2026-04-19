"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActiveEventId } from "@/lib/active-event-cookie";
import { clearActiveConference } from "@/lib/active-conference-cookie";
import { clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { clearAllocationCodeVerification } from "@/lib/allocation-code-gate-cookie";
import { normalizeEventCode } from "@/lib/join-codes";
import { findEventIdByEventCode } from "@/lib/gate-code-lookup";

export type AuthWizardConferenceResult = { ok: true } | { error: string };

/** First step of login/signup wizard: set active event cookie from code (works before sign-in via RPC). */
export async function applyConferenceCodeForAuthWizard(formData: FormData): Promise<AuthWizardConferenceResult> {
  const raw = String(formData.get("event_code") ?? "");
  const code = normalizeEventCode(raw);
  if (code.length < 4) {
    return { error: "Enter the conference code from your organisers (at least 4 characters)." };
  }

  const supabase = await createClient();
  const { data: eventId, error } = await supabase.rpc("resolve_conference_event_id_by_code", {
    p_code: raw,
  });
  if (error || !eventId || typeof eventId !== "string") {
    return { error: "No conference matches that code. Check spelling with your organisers." };
  }

  await setActiveEventId(eventId);
  await clearActiveConference();
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
  return { ok: true };
}

export async function joinEventByCode(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const code = normalizeEventCode(String(formData.get("event_code") ?? ""));
  const nextPathRaw = String(formData.get("next") ?? "/room-gate").trim() || "/room-gate";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : "/room-gate";

  if (code.length < 4) {
    return { error: "Enter the conference code from your organisers (at least 4 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const eventId = await findEventIdByEventCode(supabase, code);
  if (!eventId) {
    return { error: "No conference matches that code. Check spelling with your organisers." };
  }

  await setActiveEventId(eventId);
  await clearActiveConference();
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
  redirect(nextPath.startsWith("/") ? nextPath : "/room-gate");
}
