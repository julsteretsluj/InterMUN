// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { FWC_ROP } from "@/lib/rop";
import { findCharacter, findFrequency, powerAvailability, type CrisisCounters, type PowerUse } from "@/lib/rop/crisis";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import { isFwcCharacterSeat, loadFwcChamberSeats, type FwcSeat } from "@/lib/fwc/actor";
import {
  countersFrom,
  ensureFwcRopState,
  loadActiveCrisisUpdate,
  loadDirectiveBlockingStatus,
  type FwcSessionStateRow,
} from "@/lib/fwc/rop-state";

export type FwcPowerView = {
  key: string;
  label: string;
  summary: string | null;
  frequencyLabel: string;
  available: boolean;
  reason: string | null;
  directiveTypes: readonly string[];
  approvalNote: string | null;
};

export type FwcStatusView = { id: string; key: string; label: string; effect: string; note: string | null; appliedAt: string };

export type FwcCrisisUpdateView = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "qa" | "choosing" | "resolved";
  isBreach: boolean;
  qaEndsAt: string | null;
  pathways: { key: string; label: string; description: string }[];
  chosenPathwayKey: string | null;
  crisisDay: number | null;
  createdAt: string;
  votes: Record<string, number>;
  myVote: string | null;
};

export type FwcFeedView = { id: string; kind: string; title: string; body: string; crisisDay: number | null; createdAt: string };

export type FwcFloorRequestView = {
  id: string;
  allocationId: string;
  name: string;
  kind: "motion" | "point";
  code: string;
  label: string;
  details: Record<string, unknown>;
  status: string;
  seconds: string[];
  objections: string[];
  motionRound: number;
  createdAt: string;
  createdByRole: string | null;
};

export type FwcInventoryView = {
  code: string;
  cabinet: string;
  category: string;
  name: string;
  location: string | null;
  status: string | null;
  holderAllocationId: string | null;
  notes: string | null;
};

export function fwcReadDb(fallback: SupabaseClient): SupabaseClient {
  return createAdminClient() ?? fallback;
}

export function seatNameMap(seats: FwcSeat[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of seats) {
    if (!isFwcCharacterSeat(s.country)) continue;
    out[s.id] = lookupFwcCharacter(s.country ?? "")?.displayName ?? String(s.country);
  }
  return out;
}

export async function loadFwcRopBase(db: SupabaseClient, canonicalConferenceId: string, siblingConferenceIds: string[]) {
  const seats = await loadFwcChamberSeats(db, siblingConferenceIds, canonicalConferenceId);
  const state = await ensureFwcRopState(db, canonicalConferenceId, seats);
  return { seats, state, nameByAllocationId: seatNameMap(seats) };
}

export async function loadFwcSeatPowers(
  db: SupabaseClient,
  canonicalConferenceId: string,
  seat: FwcSeat,
  state: FwcSessionStateRow
): Promise<FwcPowerView[]> {
  const character = findCharacter(FWC_ROP, seat.country);
  if (!character) return [];
  const { data: uses } = await db
    .from("fwc_power_uses")
    .select("power_key, crisis_day, crisis_session, mod_caucus_index")
    .eq("conference_id", canonicalConferenceId)
    .eq("allocation_id", seat.id)
    .eq("voided", false);
  const counters = countersFrom(state);
  return character.powers.map((p) => {
    const freq = findFrequency(FWC_ROP, p.frequency);
    const mine = (uses ?? [])
      .filter((u) => u.power_key === p.key)
      .map((u) => ({ crisisDay: Number(u.crisis_day), crisisSession: Number(u.crisis_session), modCaucusIndex: Number(u.mod_caucus_index) }));
    const avail = freq ? powerAvailability(freq, mine, counters) : ({ ok: true, remaining: null } as const);
    return {
      key: p.key,
      label: p.label,
      summary: p.summary ?? null,
      frequencyLabel: freq?.label ?? p.frequency,
      available: avail.ok,
      reason: avail.ok ? null : avail.reason,
      directiveTypes: p.directiveTypes,
      approvalNote: p.approvalNote ?? null,
    };
  });
}

/** Seat→character map plus prior power uses, so the directive composer can list citable powers/assets. */
export async function loadFwcCitationContext(
  db: SupabaseClient,
  canonicalConferenceId: string,
  seats: FwcSeat[],
  state: FwcSessionStateRow
): Promise<{ countryByAllocationId: Record<string, string | null>; usesByAllocation: Record<string, Record<string, PowerUse[]>>; counters: CrisisCounters }> {
  const countryByAllocationId: Record<string, string | null> = {};
  for (const s of seats) if (isFwcCharacterSeat(s.country)) countryByAllocationId[s.id] = s.country;
  const usesByAllocation: Record<string, Record<string, PowerUse[]>> = {};
  const ids = Object.keys(countryByAllocationId);
  if (ids.length) {
    const { data } = await db
      .from("fwc_power_uses")
      .select("allocation_id, power_key, crisis_day, crisis_session, mod_caucus_index")
      .eq("conference_id", canonicalConferenceId)
      .in("allocation_id", ids)
      .eq("voided", false);
    for (const u of data ?? []) {
      const bySeat = (usesByAllocation[u.allocation_id] ??= {});
      (bySeat[u.power_key] ??= []).push({
        crisisDay: Number(u.crisis_day),
        crisisSession: Number(u.crisis_session),
        modCaucusIndex: Number(u.mod_caucus_index),
      });
    }
  }
  return { countryByAllocationId, usesByAllocation, counters: countersFrom(state) };
}

export async function loadFwcSeatStatuses(
  db: SupabaseClient,
  canonicalConferenceId: string,
  allocationIds: string[] | null
): Promise<Record<string, FwcStatusView[]>> {
  let q = db
    .from("fwc_character_statuses")
    .select("id, allocation_id, status_key, note, applied_at")
    .eq("conference_id", canonicalConferenceId)
    .eq("active", true);
  if (allocationIds) q = q.in("allocation_id", allocationIds);
  const { data } = await q;
  const out: Record<string, FwcStatusView[]> = {};
  for (const r of data ?? []) {
    const def = FWC_ROP.crisis!.statuses.find((s) => s.key === r.status_key);
    (out[String(r.allocation_id)] ??= []).push({
      id: String(r.id),
      key: String(r.status_key),
      label: def?.label ?? String(r.status_key),
      effect: def?.effect ?? "",
      note: (r.note as string | null) ?? null,
      appliedAt: String(r.applied_at),
    });
  }
  return out;
}

export async function loadFwcDelegateDirectiveGate(
  db: SupabaseClient,
  canonicalConferenceId: string,
  seat: FwcSeat,
  state: FwcSessionStateRow
) {
  const [active, blockedByStatus, anon] = await Promise.all([
    loadActiveCrisisUpdate(db, canonicalConferenceId),
    loadDirectiveBlockingStatus(db, canonicalConferenceId, seat.id),
    db
      .from("fwc_directives")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", canonicalConferenceId)
      .eq("submitter_allocation_id", seat.id)
      .eq("anonymity_status", "active")
      .eq("crisis_day", state.crisis_day)
      .eq("crisis_session", state.crisis_session)
      .not("approval_status", "in", "(draft,withdrawn)"),
  ]);
  return {
    activeCrisis: Boolean(active?.is_breach),
    blockedByStatus,
    anonymityUsedThisSession: (anon.count ?? 0) >= (FWC_ROP.directives?.anonymityUsesPerSession ?? 1),
  };
}

export async function loadFwcCrisisUpdates(
  db: SupabaseClient,
  canonicalConferenceId: string,
  opts: { includeDrafts: boolean; viewerAllocationId: string | null; limit?: number }
): Promise<FwcCrisisUpdateView[]> {
  let q = db
    .from("fwc_crisis_updates")
    .select("id, title, body, status, is_breach, qa_ends_at, pathways, chosen_pathway_key, crisis_day, created_at")
    .eq("conference_id", canonicalConferenceId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 10);
  if (!opts.includeDrafts) q = q.neq("status", "draft");
  const { data } = await q;
  const ids = (data ?? []).map((r) => String(r.id));
  const { data: votes } = ids.length
    ? await db.from("fwc_pathway_votes").select("crisis_update_id, allocation_id, pathway_key").in("crisis_update_id", ids)
    : { data: [] as { crisis_update_id: string; allocation_id: string; pathway_key: string }[] };
  return (data ?? []).map((r) => {
    const mine = (votes ?? []).filter((v) => v.crisis_update_id === r.id);
    const counts: Record<string, number> = {};
    for (const v of mine) counts[String(v.pathway_key)] = (counts[String(v.pathway_key)] ?? 0) + 1;
    return {
      id: String(r.id),
      title: String(r.title),
      body: String(r.body ?? ""),
      status: r.status as FwcCrisisUpdateView["status"],
      isBreach: Boolean(r.is_breach),
      qaEndsAt: (r.qa_ends_at as string | null) ?? null,
      pathways: ((r.pathways as FwcCrisisUpdateView["pathways"]) ?? []).map((p) => ({
        key: String(p.key),
        label: String(p.label),
        description: String(p.description ?? ""),
      })),
      chosenPathwayKey: (r.chosen_pathway_key as string | null) ?? null,
      crisisDay: (r.crisis_day as number | null) ?? null,
      createdAt: String(r.created_at),
      votes: counts,
      myVote: opts.viewerAllocationId
        ? (mine.find((v) => v.allocation_id === opts.viewerAllocationId)?.pathway_key ?? null)
        : null,
    };
  });
}

export async function loadFwcFeed(db: SupabaseClient, canonicalConferenceId: string, limit = 40): Promise<FwcFeedView[]> {
  const { data } = await db
    .from("fwc_crisis_feed")
    .select("id, kind, title, body, crisis_day, created_at")
    .eq("conference_id", canonicalConferenceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    title: String(r.title),
    body: String(r.body ?? ""),
    crisisDay: (r.crisis_day as number | null) ?? null,
    createdAt: String(r.created_at),
  }));
}

export async function loadFwcFloorRequests(
  db: SupabaseClient,
  canonicalConferenceId: string,
  nameByAllocationId: Record<string, string>,
  statuses: string[] = ["pending"]
): Promise<FwcFloorRequestView[]> {
  const { data } = await db
    .from("fwc_floor_requests")
    .select("id, allocation_id, kind, code, details, status, seconds, objections, motion_round, created_at, created_by_role")
    .eq("conference_id", canonicalConferenceId)
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .limit(80);
  return (data ?? []).map((r) => {
    const kind = r.kind as "motion" | "point";
    const label =
      kind === "motion"
        ? (FWC_ROP.motions.find((m) => m.code === r.code)?.label ?? String(r.code))
        : (FWC_ROP.points.find((p) => p.code === r.code)?.label ?? String(r.code));
    return {
      id: String(r.id),
      allocationId: String(r.allocation_id),
      name: nameByAllocationId[String(r.allocation_id)] ?? "—",
      kind,
      code: String(r.code),
      label,
      details: (r.details as Record<string, unknown>) ?? {},
      status: String(r.status),
      seconds: (r.seconds as string[]) ?? [],
      objections: (r.objections as string[]) ?? [],
      motionRound: Number(r.motion_round ?? 1),
      createdAt: String(r.created_at),
      createdByRole: (r.created_by_role as string | null) ?? null,
    };
  });
}

export async function loadFwcInventory(
  db: SupabaseClient,
  canonicalConferenceId: string,
  cabinets: string[] | null
): Promise<FwcInventoryView[]> {
  let q = db
    .from("fwc_inventory_items")
    .select("code, cabinet, category, name, location, status, holder_allocation_id, notes")
    .eq("conference_id", canonicalConferenceId)
    .order("code");
  if (cabinets) q = q.in("cabinet", cabinets);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    code: String(r.code),
    cabinet: String(r.cabinet),
    category: String(r.category ?? ""),
    name: String(r.name),
    location: (r.location as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    holderAllocationId: (r.holder_allocation_id as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  }));
}
