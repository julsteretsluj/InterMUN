"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { setActiveConferenceId, clearActiveConference } from "@/lib/active-conference-cookie";
import { getActiveEventId } from "@/lib/active-event-cookie";
import {
  filterConferencesForSmtRoomCodes,
  isSmtSecretariatConferenceRow,
} from "@/lib/smt-conference-filters";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function updateSmtCommitteeBindingsAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") return { error: "Only secretariat accounts can save these bindings." };

  const eventId = await getActiveEventId();
  if (!eventId) return { error: "Select a conference event first (event gate)." };

  const chairRaw = String(formData.get("smt_chair_conference_id") ?? "").trim();
  const delegateRaw = String(formData.get("smt_delegate_allocation_id") ?? "").trim();

  let smt_chair_conference_id: string | null = null;
  if (chairRaw) {
    if (!isUuid(chairRaw)) return { error: "Invalid chair committee selection." };
    const { data: c } = await supabase
      .from("conferences")
      .select("id, event_id, committee, committee_code, name")
      .eq("id", chairRaw)
      .maybeSingle();
    if (!c || c.event_id !== eventId) return { error: "Chair committee must belong to the active event." };
    if (isSmtSecretariatConferenceRow(c)) return { error: "Pick a delegate committee, not the secretariat sheet." };
    smt_chair_conference_id = chairRaw;
  }

  let smt_delegate_allocation_id: string | null = null;
  if (delegateRaw) {
    if (!isUuid(delegateRaw)) return { error: "Invalid delegate seat selection." };
    const { data: a } = await supabase
      .from("allocations")
      .select("id, user_id, conference_id")
      .eq("id", delegateRaw)
      .maybeSingle();
    if (!a || a.user_id !== user.id) return { error: "That delegate seat is not linked to your account." };
    const { data: c } = await supabase
      .from("conferences")
      .select("id, event_id, committee, committee_code, name")
      .eq("id", a.conference_id)
      .maybeSingle();
    if (!c || c.event_id !== eventId) return { error: "Delegate seat must belong to the active event." };
    if (isSmtSecretariatConferenceRow(c)) return { error: "Pick a delegate committee seat, not secretariat." };
    smt_delegate_allocation_id = delegateRaw;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      smt_chair_conference_id,
      smt_delegate_allocation_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/smt/profile");
  revalidatePath("/smt");
  return null;
}

export async function switchSmtToSecretariatAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "smt") redirect("/profile");
  await setSmtDashboardSurface("secretariat");
  await clearActiveConference();
  redirect("/smt");
}

export async function switchSmtToChairExperienceAction(conferenceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "smt") redirect("/profile");

  const cid = conferenceId.trim();
  if (!isUuid(cid)) redirect("/smt/profile?smtBind=1");

  const eventId = await getActiveEventId();
  if (!eventId) redirect("/smt/profile?smtBind=1");

  const { data: c } = await supabase
    .from("conferences")
    .select("id, event_id, committee, committee_code, name")
    .eq("id", cid)
    .maybeSingle();
  if (!c || c.event_id !== eventId || isSmtSecretariatConferenceRow(c)) {
    redirect("/smt/profile?smtBind=1");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      smt_chair_conference_id: cid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) redirect("/smt/profile?smtBind=1");

  await setSmtDashboardSurface("chair");
  await setActiveConferenceId(cid);
  redirect("/chair");
}

export async function switchSmtToDelegateExperienceAction(allocationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "smt") redirect("/profile");

  const aid = allocationId.trim();
  if (!isUuid(aid)) redirect("/smt/profile?smtBind=1");

  const eventId = await getActiveEventId();
  if (!eventId) redirect("/smt/profile?smtBind=1");

  const { data: a } = await supabase
    .from("allocations")
    .select("id, user_id, conference_id")
    .eq("id", aid)
    .maybeSingle();
  if (!a || a.user_id !== user.id) redirect("/smt/profile?smtBind=1");

  const { data: c } = await supabase
    .from("conferences")
    .select("id, event_id, committee, committee_code, name")
    .eq("id", a.conference_id)
    .maybeSingle();
  if (!c || c.event_id !== eventId || isSmtSecretariatConferenceRow(c)) {
    redirect("/smt/profile?smtBind=1");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      smt_delegate_allocation_id: aid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) redirect("/smt/profile?smtBind=1");

  await setSmtDashboardSurface("delegate");
  await setActiveConferenceId(a.conference_id);
  redirect("/delegate");
}

/** Server-only helper for smt/profile loader: committees in active event (no secretariat sheet). */
export async function loadSmtCommitteeBindingOptions(): Promise<{
  conferences: { id: string; label: string }[];
  delegateSeats: { id: string; label: string }[];
  currentChairId: string | null;
  currentDelegateAllocationId: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, smt_chair_conference_id, smt_delegate_allocation_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") return null;

  const eventId = await getActiveEventId();
  if (!eventId) {
    return {
      conferences: [],
      delegateSeats: [],
      currentChairId: (profile as { smt_chair_conference_id?: string | null }).smt_chair_conference_id ?? null,
      currentDelegateAllocationId:
        (profile as { smt_delegate_allocation_id?: string | null }).smt_delegate_allocation_id ?? null,
    };
  }

  const { data: rows } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId)
    .order("committee", { ascending: true })
    .order("name", { ascending: true });

  const committees = filterConferencesForSmtRoomCodes(rows ?? []).map((c) => {
    const label = [c.committee?.trim(), c.name?.trim()].filter(Boolean).join(" — ") || c.id.slice(0, 8);
    return { id: c.id, label };
  });

  const { data: allocRows } = await supabase
    .from("allocations")
    .select("id, country, conference_id")
    .eq("user_id", user.id);

  const allocConfIds = [...new Set((allocRows ?? []).map((r) => r.conference_id).filter(Boolean))] as string[];
  const { data: allocConfs } =
    allocConfIds.length > 0
      ? await supabase
          .from("conferences")
          .select("id, name, committee, committee_code, event_id")
          .in("id", allocConfIds)
      : { data: [] as { id: string; name: string; committee: string | null; committee_code: string | null; event_id: string }[] };
  const confById = new Map((allocConfs ?? []).map((c) => [c.id, c]));

  const delegateSeats: { id: string; label: string }[] = [];
  for (const row of allocRows ?? []) {
    const c = confById.get(row.conference_id);
    if (!c || c.event_id !== eventId) continue;
    if (isSmtSecretariatConferenceRow(c)) continue;
    delegateSeats.push({
      id: row.id,
      label: `${row.country} — ${[c.committee?.trim(), c.name?.trim()].filter(Boolean).join(" · ") || c.name}`,
    });
  }
  delegateSeats.sort((a, b) => a.label.localeCompare(b.label));

  return {
    conferences: committees,
    delegateSeats,
    currentChairId: (profile as { smt_chair_conference_id?: string | null }).smt_chair_conference_id ?? null,
    currentDelegateAllocationId:
      (profile as { smt_delegate_allocation_id?: string | null }).smt_delegate_allocation_id ?? null,
  };
}
