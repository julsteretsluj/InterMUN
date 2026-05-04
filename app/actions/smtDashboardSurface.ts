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
import {
  committeeTabKey,
  pickCanonicalConferenceRowByAllocationScore,
  resolveCanonicalCommitteeConferenceId,
} from "@/lib/conference-committee-canonical";
import { getTranslations } from "next-intl/server";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";

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
    smt_chair_conference_id = await resolveCanonicalCommitteeConferenceId(supabase, chairRaw);
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

  const canonicalCid = await resolveCanonicalCommitteeConferenceId(supabase, cid);

  const { error } = await supabase
    .from("profiles")
    .update({
      smt_chair_conference_id: canonicalCid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) redirect("/smt/profile?smtBind=1");

  await setSmtDashboardSurface("chair");
  await setActiveConferenceId(canonicalCid);
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
    const rawChair = (profile as { smt_chair_conference_id?: string | null }).smt_chair_conference_id ?? null;
    const currentChairId = rawChair
      ? await resolveCanonicalCommitteeConferenceId(supabase, rawChair)
      : null;
    return {
      conferences: [],
      delegateSeats: [],
      currentChairId,
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

  const filtered = filterConferencesForSmtRoomCodes(rows ?? []);
  const filteredIds = filtered.map((c) => c.id);
  const { data: allocSummaries } = filteredIds.length
    ? await supabase
        .from("allocations")
        .select("conference_id, user_id")
        .in("conference_id", filteredIds)
    : { data: [] as { conference_id: string | null; user_id: string | null }[] };

  const allocationRowCountByConferenceId = new Map<string, number>();
  const linkedUserCountByConferenceId = new Map<string, number>();
  for (const a of allocSummaries ?? []) {
    if (!a.conference_id) continue;
    allocationRowCountByConferenceId.set(
      a.conference_id,
      (allocationRowCountByConferenceId.get(a.conference_id) ?? 0) + 1
    );
    if (a.user_id) {
      linkedUserCountByConferenceId.set(
        a.conference_id,
        (linkedUserCountByConferenceId.get(a.conference_id) ?? 0) + 1
      );
    }
  }

  const groupsByTab = new Map<string, typeof filtered>();
  for (const c of filtered) {
    const k = committeeTabKey(c);
    const arr = groupsByTab.get(k) ?? [];
    arr.push(c);
    groupsByTab.set(k, arr);
  }

  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const committees: { id: string; label: string }[] = [];
  for (const groupRows of groupsByTab.values()) {
    const primary = pickCanonicalConferenceRowByAllocationScore(
      groupRows,
      allocationRowCountByConferenceId,
      linkedUserCountByConferenceId
    );
    const comm = primary.committee?.trim();
    const label =
      (comm ? translateCommitteeLabel(tCommitteeLabels, comm).trim() : "") ||
      primary.committee_code?.trim() ||
      primary.name?.trim() ||
      primary.id.slice(0, 8);
    committees.push({ id: primary.id, label });
  }
  committees.sort((a, b) => a.label.localeCompare(b.label));

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
    const comm = c.committee?.trim();
    const chamber =
      (comm ? translateCommitteeLabel(tCommitteeLabels, comm).trim() : "") ||
      c.committee_code?.trim() ||
      c.name?.trim() ||
      "";
    delegateSeats.push({
      id: row.id,
      label: chamber ? `${row.country?.trim() || "—"} — ${chamber}` : (row.country?.trim() || "—"),
    });
  }
  delegateSeats.sort((a, b) => a.label.localeCompare(b.label));

  const rawChairId = (profile as { smt_chair_conference_id?: string | null }).smt_chair_conference_id ?? null;
  const currentChairId = rawChairId
    ? await resolveCanonicalCommitteeConferenceId(supabase, rawChairId)
    : null;

  return {
    conferences: committees,
    delegateSeats,
    currentChairId,
    currentDelegateAllocationId:
      (profile as { smt_delegate_allocation_id?: string | null }).smt_delegate_allocation_id ?? null,
  };
}
