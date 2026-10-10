// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { FWC_ROP } from "@/lib/rop";
import type { HawkinsClockState } from "@/lib/rop/hawkins-clock";
import type { CrisisCounters } from "@/lib/rop/crisis";
import type { FwcActor, FwcSeat } from "@/lib/fwc/actor";

export const FWC_SESSION_STATE_SELECT =
  "conference_id, crisis_day, crisis_session, mod_caucus_count, motion_round, is_last_session, clock_rate, clock_start_minutes, clock_carry_over, clock_session_started_at, clock_session_base_minutes, clock_override_minutes, clock_override_at, clock_paused, clock_paused_minutes, clock_frozen_minutes, updated_at";

export type FwcSessionStateRow = {
  conference_id: string;
  crisis_day: number;
  crisis_session: number;
  mod_caucus_count: number;
  motion_round: number;
  is_last_session: boolean;
  clock_rate: number;
  clock_start_minutes: number;
  clock_carry_over: boolean;
  clock_session_started_at: string | null;
  clock_session_base_minutes: number | null;
  clock_override_minutes: number | null;
  clock_override_at: string | null;
  clock_paused: boolean;
  clock_paused_minutes: number | null;
  clock_frozen_minutes: number | null;
  updated_at: string;
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeSessionStateRow(raw: Record<string, unknown>): FwcSessionStateRow {
  return {
    conference_id: String(raw.conference_id),
    crisis_day: num(raw.crisis_day) ?? 1,
    crisis_session: num(raw.crisis_session) ?? 1,
    mod_caucus_count: num(raw.mod_caucus_count) ?? 0,
    motion_round: num(raw.motion_round) ?? 1,
    is_last_session: Boolean(raw.is_last_session),
    clock_rate: num(raw.clock_rate) ?? 6,
    clock_start_minutes: num(raw.clock_start_minutes) ?? 720,
    clock_carry_over: Boolean(raw.clock_carry_over),
    clock_session_started_at: (raw.clock_session_started_at as string | null) ?? null,
    clock_session_base_minutes: num(raw.clock_session_base_minutes),
    clock_override_minutes: num(raw.clock_override_minutes),
    clock_override_at: (raw.clock_override_at as string | null) ?? null,
    clock_paused: Boolean(raw.clock_paused),
    clock_paused_minutes: num(raw.clock_paused_minutes),
    clock_frozen_minutes: num(raw.clock_frozen_minutes),
    updated_at: String(raw.updated_at ?? ""),
  };
}

export function hawkinsClockStateFrom(
  row: FwcSessionStateRow | null,
  sessionStartedAt: string | null
): HawkinsClockState {
  return {
    sessionStartedAt,
    clockSessionStartedAt: row?.clock_session_started_at ?? null,
    sessionBaseMinutes: row?.clock_session_base_minutes ?? null,
    overrideMinutes: row?.clock_override_minutes ?? null,
    overrideAt: row?.clock_override_at ?? null,
    paused: row?.clock_paused ?? false,
    pausedMinutes: row?.clock_paused_minutes ?? null,
    frozenMinutes: row?.clock_frozen_minutes ?? null,
    crisisDay: row?.crisis_day ?? 1,
  };
}

export function countersFrom(row: FwcSessionStateRow): CrisisCounters {
  return { crisisDay: row.crisis_day, crisisSession: row.crisis_session, modCaucusCount: row.mod_caucus_count };
}

export function cabinetForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  return FWC_ROP.crisis?.characters.find((c) => c.country === country)?.cabinet ?? null;
}

/** Create the session-state row (mirroring the clock config) and seed inventories once. */
export async function ensureFwcRopState(
  db: SupabaseClient,
  canonicalConferenceId: string,
  seats: FwcSeat[]
): Promise<FwcSessionStateRow> {
  const clock = FWC_ROP.crisis!.clock;
  await db.from("fwc_session_state").upsert(
    {
      conference_id: canonicalConferenceId,
      clock_rate: clock.rate,
      clock_start_minutes: clock.startMinutes,
      clock_carry_over: clock.carryOverBetweenSessions,
    },
    { onConflict: "conference_id", ignoreDuplicates: true }
  );

  const { count } = await db
    .from("fwc_inventory_items")
    .select("code", { count: "exact", head: true })
    .eq("conference_id", canonicalConferenceId);
  if (!count) {
    const seatsByCabinet = cabinetSeatMap(seats);
    await db.from("fwc_inventory_items").upsert(
      FWC_ROP.crisis!.inventory.map((item) => ({
        conference_id: canonicalConferenceId,
        code: item.code,
        cabinet: item.cabinet,
        category: item.category,
        name: item.name,
        location: item.location,
        status: item.status,
        cabinet_allocation_ids: item.cabinet === "public" ? [] : (seatsByCabinet[item.cabinet] ?? []),
      })),
      { onConflict: "conference_id,code", ignoreDuplicates: true }
    );
  }

  const { data } = await db
    .from("fwc_session_state")
    .select(FWC_SESSION_STATE_SELECT)
    .eq("conference_id", canonicalConferenceId)
    .single();
  return normalizeSessionStateRow((data ?? { conference_id: canonicalConferenceId }) as Record<string, unknown>);
}

export function cabinetSeatMap(seats: FwcSeat[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const seat of seats) {
    const cabinet = cabinetForCountry(seat.country);
    if (!cabinet) continue;
    (out[cabinet] ??= []).push(seat.id);
  }
  return out;
}

export async function loadProcedureSessionStartedAt(
  db: SupabaseClient,
  canonicalConferenceId: string
): Promise<{ startedAt: string | null; state: string | null }> {
  const { data } = await db
    .from("procedure_states")
    .select("committee_session_started_at, state")
    .eq("conference_id", canonicalConferenceId)
    .maybeSingle();
  return {
    startedAt: (data?.committee_session_started_at as string | null) ?? null,
    state: (data?.state as string | null) ?? null,
  };
}

/** Crisis update currently in Q&A or pathway choice (a live breach). */
export async function loadActiveCrisisUpdate(
  db: SupabaseClient,
  canonicalConferenceId: string
): Promise<{ id: string; status: string; is_breach: boolean } | null> {
  const { data } = await db
    .from("fwc_crisis_updates")
    .select("id, status, is_breach")
    .eq("conference_id", canonicalConferenceId)
    .in("status", ["qa", "choosing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; status: string; is_breach: boolean } | null) ?? null;
}

/** Label of the first active status that blocks directives for this seat, if any. */
export async function loadDirectiveBlockingStatus(
  db: SupabaseClient,
  canonicalConferenceId: string,
  allocationId: string
): Promise<string | null> {
  const blocking = FWC_ROP.directives?.blockingStatusKeys ?? [];
  if (blocking.length === 0) return null;
  const { data } = await db
    .from("fwc_character_statuses")
    .select("status_key")
    .eq("conference_id", canonicalConferenceId)
    .eq("allocation_id", allocationId)
    .eq("active", true)
    .in("status_key", [...blocking])
    .limit(1)
    .maybeSingle();
  if (!data?.status_key) return null;
  const def = FWC_ROP.crisis?.statuses.find((s) => s.key === data.status_key);
  return (def?.label ?? String(data.status_key)).toLowerCase();
}

export async function logFwcDirectiveEvent(
  actor: Pick<FwcActor, "db" | "userId" | "actorRole" | "actingAllocationId" | "canonicalConferenceId">,
  input: {
    directiveId: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    internal?: boolean;
  }
): Promise<void> {
  await actor.db.from("fwc_directive_events").insert({
    directive_id: input.directiveId,
    conference_id: actor.canonicalConferenceId,
    action: input.action,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    note: input.note?.trim() || null,
    internal: Boolean(input.internal),
    actor_user_id: actor.userId,
    actor_role: actor.actorRole,
    acting_allocation_id: actor.actingAllocationId,
  });
}

export async function publishFwcFeed(
  actor: Pick<FwcActor, "db" | "userId" | "canonicalConferenceId">,
  input: {
    kind: "directive_outcome" | "press_release" | "crisis_update" | "pathway" | "announcement" | "day_result";
    title: string;
    body?: string | null;
    directiveId?: string | null;
    crisisUpdateId?: string | null;
    crisisDay?: number | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await actor.db.from("fwc_crisis_feed").insert({
    conference_id: actor.canonicalConferenceId,
    kind: input.kind,
    title: input.title.trim(),
    body: input.body?.trim() ?? "",
    directive_id: input.directiveId ?? null,
    crisis_update_id: input.crisisUpdateId ?? null,
    crisis_day: input.crisisDay ?? null,
    published_by: input.kind === "press_release" ? null : actor.userId,
  });
  return { error: error?.message ?? null };
}
