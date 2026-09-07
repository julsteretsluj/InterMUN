// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

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
  dedupeCanonicalCommitteesByDisplayLabel,
  mergeAllocationsAcrossSiblingConferences,
  pickCanonicalConferenceRowByAllocationScore,
  resolveCanonicalCommitteeConferenceId,
} from "@/lib/conference-committee-canonical";
import { compareCommitteeRowsByDifficultyThenLabel } from "@/lib/committee-difficulty-sort";
import { getTranslations } from "next-intl/server";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";
import { isDaisSeatAllocationCountry } from "@/lib/dais-seat-plan";
import type { SupabaseClient } from "@supabase/supabase-js";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/** PostgREST caps a single select at ~1000 rows; page so FWC / late chambers are not dropped. */
async function fetchAllAllocationRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  conferenceIds: string[],
  columns: string
): Promise<T[]> {
  if (conferenceIds.length === 0) return [];
  const pageSize = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("allocations")
      .select(columns)
      .in("conference_id", conferenceIds)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    out.push(...(data as unknown as T[]));
    if (data.length < pageSize) break;
  }
  return out;
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
      .select("id, user_id, conference_id, country")
      .eq("id", delegateRaw)
      .maybeSingle();
    if (!a?.conference_id) return { error: "Invalid delegate seat selection." };
    if (isDaisSeatAllocationCountry(a.country)) {
      return { error: "Pick a delegate placard, not a dais seat." };
    }
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

export async function switchSmtToChairExperienceByAllocationAction(allocationId: string) {
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

  const { data: allocation } = await supabase
    .from("allocations")
    .select("id, conference_id, user_id")
    .eq("id", aid)
    .maybeSingle();
  if (!allocation?.conference_id) redirect("/smt/profile?smtBind=1");

  const { data: c } = await supabase
    .from("conferences")
    .select("id, event_id, committee, committee_code, name")
    .eq("id", allocation.conference_id)
    .maybeSingle();
  if (!c || c.event_id !== eventId || isSmtSecretariatConferenceRow(c)) {
    redirect("/smt/profile?smtBind=1");
  }

  const canonicalCid = await resolveCanonicalCommitteeConferenceId(supabase, c.id);

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
    .select("id, user_id, conference_id, country")
    .eq("id", aid)
    .maybeSingle();
  if (!a || !a.conference_id) redirect("/smt/profile?smtBind=1");
  if (isDaisSeatAllocationCountry(a.country)) redirect("/smt/profile?smtBind=1");

  const { data: c } = await supabase
    .from("conferences")
    .select("id, event_id, committee, committee_code, name")
    .eq("id", a.conference_id)
    .maybeSingle();
  if (!c || c.event_id !== eventId || isSmtSecretariatConferenceRow(c)) {
    redirect("/smt/profile?smtBind=1");
  }

  const canonicalCid = await resolveCanonicalCommitteeConferenceId(supabase, a.conference_id);

  const { error } = await supabase
    .from("profiles")
    .update({
      smt_delegate_allocation_id: aid,
      smt_chair_conference_id: canonicalCid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) redirect("/smt/profile?smtBind=1&smtPreview=delegate");

  await setSmtDashboardSurface("delegate");
  await setActiveConferenceId(canonicalCid);
  redirect("/delegate");
}

/** Server-only helper for smt/profile loader: committees in active event (no secretariat sheet). */
export async function loadSmtCommitteeBindingOptions(): Promise<{
  conferences: { id: string; label: string }[];
  delegateSeatsByConferenceId: Record<string, { id: string; label: string }[]>;
  chairSeatsByConferenceId: Record<string, { id: string; label: string }[]>;
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
      delegateSeatsByConferenceId: {},
      chairSeatsByConferenceId: {},
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

  type AllocSummary = { conference_id: string | null; user_id: string | null };
  const allocSummaries = await fetchAllAllocationRows<AllocSummary>(
    supabase,
    filteredIds,
    "conference_id, user_id"
  );

  const allocationRowCountByConferenceId = new Map<string, number>();
  const linkedUserCountByConferenceId = new Map<string, number>();
  for (const a of allocSummaries) {
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

  const canonicalByConferenceId = new Map<string, string>();
  for (const groupRows of groupsByTab.values()) {
    const primary = pickCanonicalConferenceRowByAllocationScore(
      groupRows,
      allocationRowCountByConferenceId,
      linkedUserCountByConferenceId
    );
    for (const row of groupRows) canonicalByConferenceId.set(row.id, primary.id);
  }

  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const committeesRaw: { id: string; label: string; committee: string | null }[] = [];
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
    committeesRaw.push({ id: primary.id, label, committee: primary.committee });
  }
  committeesRaw.sort((a, b) =>
    compareCommitteeRowsByDifficultyThenLabel(
      { committee: a.committee, name: a.label },
      { committee: b.committee, name: b.label }
    )
  );

  const { committees: dedupedCommittees, conferenceIdToCanonical } = dedupeCanonicalCommitteesByDisplayLabel(
    committeesRaw.map(({ id, label }) => ({ id, label })),
    canonicalByConferenceId
  );
  const committees = dedupedCommittees;

  type AllocRow = {
    id: string;
    country: string | null;
    conference_id: string;
    user_id: string | null;
  };
  const allocRows = await fetchAllAllocationRows<AllocRow>(
    supabase,
    filteredIds,
    "id, country, conference_id, user_id"
  );

  const linkedUserIds = [
    ...new Set(allocRows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
  ];
  const profileNameById = new Map<string, string>();
  if (linkedUserIds.length > 0) {
    const pageSize = 1000;
    for (let from = 0; from < linkedUserIds.length; from += pageSize) {
      const slice = linkedUserIds.slice(from, from + pageSize);
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", slice);
      for (const p of profiles ?? []) {
        const name = p.name?.trim();
        if (name) profileNameById.set(p.id, name);
      }
    }
  }

  const rowsByCanonical = new Map<string, AllocRow[]>();
  for (const row of allocRows) {
    const canonicalId = conferenceIdToCanonical.get(row.conference_id);
    if (!canonicalId) continue;
    const arr = rowsByCanonical.get(canonicalId) ?? [];
    arr.push(row);
    rowsByCanonical.set(canonicalId, arr);
  }

  const delegateSeatsByConferenceId: Record<string, { id: string; label: string }[]> = {};
  const chairSeatsByConferenceId: Record<string, { id: string; label: string }[]> = {};
  for (const c of committees) {
    delegateSeatsByConferenceId[c.id] = [];
    chairSeatsByConferenceId[c.id] = [];
  }

  for (const [canonicalId, groupRows] of rowsByCanonical) {
    if (!delegateSeatsByConferenceId[canonicalId]) {
      delegateSeatsByConferenceId[canonicalId] = [];
      chairSeatsByConferenceId[canonicalId] = [];
    }
    const merged = mergeAllocationsAcrossSiblingConferences(groupRows, canonicalId);
    for (const row of merged) {
      const displayCountry = row.country?.trim() || "—";
      const displayName = row.user_id ? profileNameById.get(row.user_id) ?? null : null;
      const seatLabel = displayName ? `${displayCountry} — ${displayName}` : displayCountry;

      // Chair preview uses dais placards only. Country / character seats stay in the delegate list
      // even if a chair-role profile is linked — otherwise SMT can't preview that placard.
      if (isDaisSeatAllocationCountry(row.country)) {
        chairSeatsByConferenceId[canonicalId]!.push({ id: row.id, label: seatLabel });
        continue;
      }
      delegateSeatsByConferenceId[canonicalId]!.push({ id: row.id, label: seatLabel });
    }
  }

  for (const c of committees) {
    delegateSeatsByConferenceId[c.id]?.sort((a, b) => a.label.localeCompare(b.label));
    chairSeatsByConferenceId[c.id]?.sort((a, b) => a.label.localeCompare(b.label));
  }

  const rawChairId = (profile as { smt_chair_conference_id?: string | null }).smt_chair_conference_id ?? null;
  let currentChairId = rawChairId
    ? await resolveCanonicalCommitteeConferenceId(supabase, rawChairId)
    : null;
  if (currentChairId) {
    currentChairId = conferenceIdToCanonical.get(currentChairId) ?? currentChairId;
  }

  return {
    conferences: committees,
    delegateSeatsByConferenceId,
    chairSeatsByConferenceId,
    currentChairId,
    currentDelegateAllocationId:
      (profile as { smt_delegate_allocation_id?: string | null }).smt_delegate_allocation_id ?? null,
  };
}
