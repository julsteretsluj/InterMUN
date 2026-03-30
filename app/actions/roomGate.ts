"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearActiveConference } from "@/lib/active-conference-cookie";
import { clearActiveEvent, getActiveEventId } from "@/lib/active-event-cookie";
import { clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { clearAllocationCodeVerification } from "@/lib/allocation-code-gate-cookie";
import { normalizeCommitteeCode, SMT_COMMITTEE_CODE } from "@/lib/join-codes";
import { isValidCommitteeJoinCode } from "@/lib/committee-join-code";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { canUseLatestCommitteeShortcut } from "@/lib/roles";
import { findConferenceIdBySecondGateCode } from "@/lib/gate-code-lookup";

export async function clearRoomAndCommitteeContext() {
  await clearActiveEvent();
  await clearActiveConference();
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
}

/** Clear committee context only; keep selected conference event (second gate again). */
export async function clearCommitteeContextOnly() {
  await clearActiveConference();
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
}

export async function joinRoomByCode(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const code = normalizeCommitteeCode(String(formData.get("code") ?? ""));
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  if (!isValidCommitteeJoinCode(code)) {
    return {
      error:
        "Enter the 6-character committee code (letters and digits only, e.g. ECO741). Ask your chair or check SMT → Room codes.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const eventId = await getActiveEventId();
  if (!eventId) {
    return {
      error: "Enter your conference code first (go back to the previous step).",
    };
  }

  const conferenceId = await findConferenceIdBySecondGateCode(supabase, eventId, code);
  if (!conferenceId) {
    return {
      error:
        "No committee matches that code for this event. Enter the conference code first, then the exact 6-character committee code (SMT → Room codes or Supabase → conferences).",
    };
  }

  await setActiveConferenceContext(supabase, conferenceId);
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
  redirect(nextPath);
}

export async function setRoomCodeAndEnterAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const code = normalizeCommitteeCode(String(formData.get("code") ?? ""));
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  if (!conferenceId) {
    return { error: "Choose a conference." };
  }
  if (!isValidCommitteeJoinCode(code)) {
    return { error: "Committee code must be exactly 6 letters or digits (e.g. ECO741)." };
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

  const role = profile?.role ?? null;
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    return { error: "Only chairs, SMT, and admins can set committee codes." };
  }

  if (role === "chair") {
    const { data: seats } = await supabase
      .from("allocations")
      .select("conference_id")
      .eq("user_id", user.id);
    const allowed = new Set(
      (seats ?? []).map((s) => s.conference_id).filter((id): id is string => Boolean(id))
    );
    if (!allowed.has(conferenceId)) {
      return {
        error: "You can only set the committee code for a session where you have a seat.",
      };
    }
  }

  const { error } = await supabase.rpc("set_conference_room_code", {
    p_conference_id: conferenceId,
    p_room_code: code,
  });

  if (error) {
    return { error: error.message };
  }

  await setActiveConferenceContext(supabase, conferenceId);
  // Do not clear committee second-gate cookie: delegates stay verified until next login.
  await clearAllocationCodeVerification();
  redirect(nextPath);
}

/** When exactly one event and one committee exist, set both cookies and skip both gates. */
export async function implicitJoinSingletonAction(formData: FormData) {
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { count: eventCount } = await supabase
    .from("conference_events")
    .select("*", { count: "exact", head: true });
  const { count: confCount } = await supabase
    .from("conferences")
    .select("*", { count: "exact", head: true });

  if ((eventCount ?? 0) !== 1 || (confCount ?? 0) !== 1) {
    redirect(`/event-gate?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: ev } = await supabase.from("conference_events").select("id").limit(1).maybeSingle();
  const { data: conf } = await supabase
    .from("conferences")
    .select("id, event_id")
    .limit(1)
    .maybeSingle();

  if (!ev?.id || !conf?.id || conf.event_id !== ev.id) {
    redirect(`/event-gate?next=${encodeURIComponent(nextPath)}`);
  }

  await setActiveConferenceContext(supabase, conf.id);
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
  redirect(nextPath);
}

/** Chair/SMT: set active committee to latest row (sets event + committee cookies). */
export async function staffContinueWithLatestConference(formData: FormData) {
  const nextPathRaw = String(formData.get("next") ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/room-gate")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canUseLatestCommitteeShortcut(profile?.role)) {
    redirect(
      `/room-gate?next=${encodeURIComponent(nextPath)}&e=latest-smt-only`
    );
  }

  const eventId = await getActiveEventId();

  let smtQuery = supabase
    .from("conferences")
    .select("id, event_id")
    .eq("committee_code", SMT_COMMITTEE_CODE);
  if (eventId) {
    smtQuery = smtQuery.eq("event_id", eventId);
  }
  let { data: conf } = await smtQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!conf?.id) {
    const { data: latest } = await supabase
      .from("conferences")
      .select("id, event_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    conf = latest;
  }

  if (!conf?.id || !conf.event_id) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}&e=no-conferences`);
  }

  await setActiveConferenceContext(supabase, conf.id);
  await clearVerifiedConference();
  await clearAllocationCodeVerification();
  redirect(nextPath);
}
