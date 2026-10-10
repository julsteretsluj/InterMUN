// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { FWC_ROP } from "@/lib/rop";
import {
  canDelegateRaiseMotion,
  findRopMotion,
  missingMotionFields,
  motionAllowedInPhase,
  motionPassesUnopposed,
  ropMotionMajority,
  type RopMotionDetail,
} from "@/lib/rop/procedure";
import {
  delegateSuccessStats,
  findCharacter,
  findFrequency,
  findPower,
  pathwayWinner,
  powerAvailability,
} from "@/lib/rop/crisis";
import { computeHawkinsMinutes, parseHawkinsTime } from "@/lib/rop/hawkins-clock";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import {
  isFwcCharacterSeat,
  isUuid,
  loadFwcChamberSeats,
  resolveFwcActor,
  type FwcActor,
  type FwcResult,
} from "@/lib/fwc/actor";
import {
  cabinetSeatMap,
  countersFrom,
  ensureFwcRopState,
  hawkinsClockStateFrom,
  loadProcedureSessionStartedAt,
  publishFwcFeed,
  type FwcSessionStateRow,
} from "@/lib/fwc/rop-state";

const PATHS = ["/fwc/crisis", "/fwc/directives", "/fwc/map", "/fwc/movement", "/chair/fwc/control", "/chair/fwc/backroom"] as const;

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

function clean(v: string | null | undefined, max = 4000): string | null {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
}

async function staffActor(conferenceId: string): Promise<FwcResult<FwcActor>> {
  return resolveFwcActor(conferenceId, { requireStaff: true });
}

async function stateFor(actor: FwcActor): Promise<FwcSessionStateRow> {
  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  return ensureFwcRopState(actor.db, actor.canonicalConferenceId, seats);
}

/* ------------------------------------------------------------------ */
/* Session state + Hawkins clock                                       */
/* ------------------------------------------------------------------ */

export async function ensureFwcSessionState(conferenceId: string): Promise<FwcResult<FwcSessionStateRow>> {
  const actorRes = await resolveFwcActor(conferenceId);
  if (!actorRes.ok) return actorRes;
  return { ok: true, data: await stateFor(actorRes.data) };
}

export async function controlHawkinsClock(input: {
  conferenceId: string;
  action: "set" | "pause" | "resume";
  /** "HH:MM" for `set`. */
  time?: string | null;
  day?: number | null;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const state = await stateFor(actor);
  const clock = FWC_ROP.crisis!.clock;
  const session = await loadProcedureSessionStartedAt(actor.db, actor.canonicalConferenceId);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const current = computeHawkinsMinutes(clock, hawkinsClockStateFrom(state, session.startedAt), nowMs).total;

  let patch: Record<string, unknown>;
  if (input.action === "set") {
    const dayOffset = clock.carryOverBetweenSessions ? Math.max(1, Number(input.day) || 1) : 1;
    const minutes = parseHawkinsTime(input.time ?? "", dayOffset);
    if (minutes == null) return { ok: false, error: "Enter a time as HH:MM (00:00–23:59)." };
    patch = state.clock_paused
      ? { clock_paused_minutes: minutes }
      : session.startedAt
        ? { clock_override_minutes: minutes, clock_override_at: nowIso }
        : { clock_frozen_minutes: minutes };
  } else if (input.action === "pause") {
    if (state.clock_paused) return { ok: true, data: null };
    patch = { clock_paused: true, clock_paused_minutes: current };
  } else {
    if (!state.clock_paused) return { ok: true, data: null };
    const resumeAt = state.clock_paused_minutes ?? current;
    patch = session.startedAt
      ? { clock_paused: false, clock_paused_minutes: null, clock_override_minutes: resumeAt, clock_override_at: nowIso }
      : { clock_paused: false, clock_paused_minutes: null, clock_frozen_minutes: resumeAt };
  }
  const { error } = await actor.db
    .from("fwc_session_state")
    .update({ ...patch, updated_at: nowIso })
    .eq("conference_id", actor.canonicalConferenceId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function updateFwcCounters(input: {
  conferenceId: string;
  crisisDay?: number;
  crisisSession?: number;
  modCaucusCount?: number;
  motionRound?: number;
  isLastSession?: boolean;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  await stateFor(actor);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const int = (v: unknown, min: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= min ? n : null;
  };
  if (input.crisisDay != null) patch.crisis_day = int(input.crisisDay, 1) ?? 1;
  if (input.crisisSession != null) patch.crisis_session = int(input.crisisSession, 1) ?? 1;
  if (input.modCaucusCount != null) patch.mod_caucus_count = int(input.modCaucusCount, 0) ?? 0;
  if (input.motionRound != null) patch.motion_round = int(input.motionRound, 1) ?? 1;
  if (input.isLastSession != null) patch.is_last_session = Boolean(input.isLastSession);
  const { error } = await actor.db
    .from("fwc_session_state")
    .update(patch)
    .eq("conference_id", actor.canonicalConferenceId);
  if (error) return { ok: false, error: error.message };
  if (input.crisisDay != null) {
    // A new crisis day resets per-session anonymity and the movement cycle.
    await actor.db
      .from("fwc_character_states")
      .update({ anonymity_used_session: false, mp_spent: 0, updated_at: new Date().toISOString() })
      .eq("conference_id", actor.canonicalConferenceId);
  }
  revalidate();
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/* Crisis updates + pathways + feed                                    */
/* ------------------------------------------------------------------ */

export type FwcPathwayInput = { key?: string; label: string; description?: string | null };

export async function saveFwcCrisisUpdate(input: {
  conferenceId: string;
  id?: string | null;
  title: string;
  body?: string | null;
  isBreach?: boolean;
  pathways: FwcPathwayInput[];
}): Promise<FwcResult<{ id: string }>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const title = clean(input.title, 200);
  if (!title) return { ok: false, error: "Give the crisis update a title." };
  const pathways = input.pathways
    .map((p, i) => ({
      key: (p.key?.trim() || `p${i + 1}`).slice(0, 40),
      label: (p.label ?? "").trim().slice(0, 200),
      description: (p.description ?? "").trim().slice(0, 1000),
    }))
    .filter((p) => p.label);
  if (pathways.length < 2) return { ok: false, error: "Offer at least two pathways." };
  const state = await stateFor(actor);
  const row = {
    conference_id: actor.canonicalConferenceId,
    title,
    body: clean(input.body, 8000) ?? "",
    is_breach: input.isBreach ?? true,
    pathways,
    crisis_day: state.crisis_day,
    crisis_session: state.crisis_session,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    if (!isUuid(input.id)) return { ok: false, error: "Invalid crisis update id." };
    const { error } = await actor.db
      .from("fwc_crisis_updates")
      .update(row)
      .eq("id", input.id)
      .eq("conference_id", actor.canonicalConferenceId)
      .eq("status", "draft");
    if (error) return { ok: false, error: error.message };
    revalidate();
    return { ok: true, data: { id: input.id } };
  }
  const { data, error } = await actor.db
    .from("fwc_crisis_updates")
    .insert({ ...row, created_by: actor.userId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save the crisis update." };
  revalidate();
  return { ok: true, data: { id: String(data.id) } };
}

export async function advanceFwcCrisisUpdate(input: {
  conferenceId: string;
  id: string;
  to: "qa" | "choosing" | "resolved";
  /** Chair's pick when the vote ties (or to override with a stated reason). */
  chosenPathwayKey?: string | null;
}): Promise<FwcResult<{ status: string; chosenPathwayKey: string | null }>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  if (!isUuid(input.id)) return { ok: false, error: "Invalid crisis update id." };
  const { data: row } = await actor.db
    .from("fwc_crisis_updates")
    .select("id, title, body, status, pathways, crisis_day")
    .eq("id", input.id)
    .eq("conference_id", actor.canonicalConferenceId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Crisis update not found." };
  const order = ["draft", "qa", "choosing", "resolved"];
  if (order.indexOf(input.to) <= order.indexOf(String(row.status))) {
    return { ok: false, error: "That step has already happened." };
  }
  const patch: Record<string, unknown> = { status: input.to, updated_at: new Date().toISOString() };
  let chosen: string | null = null;
  if (input.to === "qa") {
    patch.qa_ends_at = new Date(Date.now() + FWC_ROP.crisis!.qaSeconds * 1000).toISOString();
  }
  if (input.to === "resolved") {
    const { data: votes } = await actor.db
      .from("fwc_pathway_votes")
      .select("pathway_key")
      .eq("crisis_update_id", row.id);
    const winner = pathwayWinner((votes ?? []) as { pathway_key: string }[]);
    const pathways = (row.pathways as { key: string; label: string }[]) ?? [];
    chosen = input.chosenPathwayKey && pathways.some((p) => p.key === input.chosenPathwayKey)
      ? input.chosenPathwayKey
      : winner.key;
    if (!chosen) return { ok: false, error: "The vote is tied or empty — pick the pathway to resolve it." };
    patch.chosen_pathway_key = chosen;
    const label = pathways.find((p) => p.key === chosen)?.label ?? chosen;
    const tally = Object.entries(winner.counts)
      .map(([k, n]) => `${pathways.find((p) => p.key === k)?.label ?? k}: ${n}`)
      .join(" · ");
    await publishFwcFeed(actor, {
      kind: "pathway",
      title: `Pathway chosen: ${label}`,
      body: tally ? `${row.title}\n${tally}` : String(row.title),
      crisisUpdateId: row.id,
      crisisDay: row.crisis_day as number | null,
    });
  }
  const { error } = await actor.db.from("fwc_crisis_updates").update(patch).eq("id", row.id);
  if (error) return { ok: false, error: error.message };
  if (input.to === "qa") {
    await publishFwcFeed(actor, {
      kind: "crisis_update",
      title: String(row.title),
      body: String(row.body ?? ""),
      crisisUpdateId: row.id,
      crisisDay: row.crisis_day as number | null,
    });
  }
  revalidate();
  return { ok: true, data: { status: input.to, chosenPathwayKey: chosen } };
}

export async function castFwcPathwayVote(input: {
  conferenceId: string;
  crisisUpdateId: string;
  pathwayKey: string;
  actingAllocationId?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await resolveFwcActor(input.conferenceId, {
    actingAllocationId: input.actingAllocationId,
    requireSeat: true,
  });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  if (!isUuid(input.crisisUpdateId)) return { ok: false, error: "Invalid crisis update id." };
  const { data: row } = await actor.db
    .from("fwc_crisis_updates")
    .select("id, status, pathways")
    .eq("id", input.crisisUpdateId)
    .eq("conference_id", actor.canonicalConferenceId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Crisis update not found." };
  if (row.status !== "choosing") return { ok: false, error: "Pathway voting is not open." };
  if (!((row.pathways as { key: string }[]) ?? []).some((p) => p.key === input.pathwayKey)) {
    return { ok: false, error: "Unknown pathway." };
  }
  const { error } = await actor.db.from("fwc_pathway_votes").upsert(
    {
      crisis_update_id: row.id,
      allocation_id: actor.seat!.id,
      conference_id: actor.canonicalConferenceId,
      pathway_key: input.pathwayKey,
      created_at: new Date().toISOString(),
    },
    { onConflict: "crisis_update_id,allocation_id" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fwc/crisis");
  return { ok: true, data: null };
}

export async function postFwcAnnouncement(input: {
  conferenceId: string;
  title: string;
  body?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const title = clean(input.title, 200);
  if (!title) return { ok: false, error: "Give the announcement a title." };
  const state = await stateFor(actorRes.data);
  const { error } = await publishFwcFeed(actorRes.data, {
    kind: "announcement",
    title,
    body: input.body,
    crisisDay: state.crisis_day,
  });
  if (error) return { ok: false, error };
  revalidate();
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/* Character statuses, powers, meters, inventory                       */
/* ------------------------------------------------------------------ */

async function requireChamberCharacter(actor: FwcActor, allocationId: string): Promise<FwcResult<{ country: string }>> {
  if (!isUuid(allocationId)) return { ok: false, error: "Invalid seat." };
  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  const seat = seats.find((s) => s.id === allocationId);
  if (!seat || !isFwcCharacterSeat(seat.country)) return { ok: false, error: "That seat is not an FWC character." };
  return { ok: true, data: { country: String(seat.country) } };
}

export async function applyFwcCharacterStatus(input: {
  conferenceId: string;
  allocationId: string;
  statusKey: string;
  note?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = await requireChamberCharacter(actor, input.allocationId);
  if (!seat.ok) return seat;
  if (!FWC_ROP.crisis!.statuses.some((s) => s.key === input.statusKey)) return { ok: false, error: "Unknown status." };
  const { error } = await actor.db.from("fwc_character_statuses").insert({
    conference_id: actor.canonicalConferenceId,
    allocation_id: input.allocationId,
    status_key: input.statusKey,
    note: clean(input.note, 1000),
    applied_by: actor.userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function clearFwcCharacterStatus(input: { conferenceId: string; id: string }): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  if (!isUuid(input.id)) return { ok: false, error: "Invalid status id." };
  const { error } = await actorRes.data.db
    .from("fwc_character_statuses")
    .update({ active: false, cleared_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("conference_id", actorRes.data.canonicalConferenceId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function recordFwcPowerUse(input: {
  conferenceId: string;
  allocationId: string;
  powerKey: string;
  note?: string | null;
  /** Record even when the frequency limit says no (chair discretion). */
  override?: boolean;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = await requireChamberCharacter(actor, input.allocationId);
  if (!seat.ok) return seat;
  const power = findPower(findCharacter(FWC_ROP, seat.data.country), input.powerKey);
  if (!power) return { ok: false, error: "That power does not belong to this character." };
  const state = await stateFor(actor);
  const frequency = findFrequency(FWC_ROP, power.frequency);
  if (frequency && !input.override) {
    const { data: uses } = await actor.db
      .from("fwc_power_uses")
      .select("crisis_day, crisis_session, mod_caucus_index")
      .eq("conference_id", actor.canonicalConferenceId)
      .eq("allocation_id", input.allocationId)
      .eq("power_key", power.key)
      .eq("voided", false);
    const avail = powerAvailability(
      frequency,
      (uses ?? []).map((u) => ({
        crisisDay: Number(u.crisis_day),
        crisisSession: Number(u.crisis_session),
        modCaucusIndex: Number(u.mod_caucus_index),
      })),
      countersFrom(state)
    );
    if (!avail.ok) return { ok: false, error: `${power.label}: ${avail.reason}` };
  }
  const { error } = await actor.db.from("fwc_power_uses").insert({
    conference_id: actor.canonicalConferenceId,
    allocation_id: input.allocationId,
    power_key: power.key,
    crisis_day: state.crisis_day,
    crisis_session: state.crisis_session,
    mod_caucus_index: state.mod_caucus_count,
    note: clean(input.note, 1000),
    recorded_by: actor.userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function voidFwcPowerUse(input: { conferenceId: string; id: string }): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  if (!isUuid(input.id)) return { ok: false, error: "Invalid power use id." };
  const { error } = await actorRes.data.db
    .from("fwc_power_uses")
    .update({ voided: true })
    .eq("id", input.id)
    .eq("conference_id", actorRes.data.canonicalConferenceId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function updateFwcCharacterMeters(input: {
  conferenceId: string;
  allocationId: string;
  meters: Record<string, number>;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = await requireChamberCharacter(actor, input.allocationId);
  if (!seat.ok) return seat;
  const character = findCharacter(FWC_ROP, seat.data.country);
  if (!character) return { ok: false, error: "Unknown character." };
  const { data: row } = await actor.db
    .from("fwc_character_states")
    .select("meters")
    .eq("conference_id", actor.canonicalConferenceId)
    .eq("allocation_id", input.allocationId)
    .maybeSingle();
  if (!row) return { ok: false, error: "No character state for this seat yet." };
  const next = { ...((row.meters as Record<string, number>) ?? {}) };
  const legacy: Record<string, number> = {};
  for (const def of character.meters) {
    const raw = input.meters[def.key];
    if (raw == null || !Number.isFinite(Number(raw))) continue;
    const v = Math.min(def.max, Math.max(def.min, Math.round(Number(raw))));
    next[def.key] = v;
    if (def.legacyColumn) legacy[def.legacyColumn] = v;
  }
  const { error } = await actor.db
    .from("fwc_character_states")
    .update({ meters: next, updated_at: new Date().toISOString() })
    .eq("conference_id", actor.canonicalConferenceId)
    .eq("allocation_id", input.allocationId);
  if (error) return { ok: false, error: error.message };
  if (Object.keys(legacy).length) {
    await actor.db
      .from("fwc_meters")
      .update({ ...legacy, updated_at: new Date().toISOString() })
      .eq("conference_id", actor.canonicalConferenceId);
  }
  revalidate();
  return { ok: true, data: null };
}

export async function updateFwcInventoryItem(input: {
  conferenceId: string;
  code: string;
  cabinet?: string;
  status?: string | null;
  location?: string | null;
  holderAllocationId?: string | null;
  notes?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  await ensureFwcRopState(actor.db, actor.canonicalConferenceId, seats);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.cabinet !== undefined) {
    const valid = ["public", ...FWC_ROP.crisis!.cabinets.map((c) => c.key)];
    if (!valid.includes(input.cabinet)) return { ok: false, error: "Unknown cabinet." };
    patch.cabinet = input.cabinet;
    patch.cabinet_allocation_ids = input.cabinet === "public" ? [] : (cabinetSeatMap(seats)[input.cabinet] ?? []);
  }
  if (input.status !== undefined) patch.status = clean(input.status, 200);
  if (input.location !== undefined) patch.location = clean(input.location, 40);
  if (input.notes !== undefined) patch.notes = clean(input.notes, 1000);
  if (input.holderAllocationId !== undefined) {
    if (input.holderAllocationId && !seats.some((s) => s.id === input.holderAllocationId)) {
      return { ok: false, error: "Holder must be a seat in this committee." };
    }
    patch.holder_allocation_id = input.holderAllocationId || null;
  }
  const { error } = await actor.db
    .from("fwc_inventory_items")
    .update(patch)
    .eq("conference_id", actor.canonicalConferenceId)
    .eq("code", input.code);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/* Delegate floor requests (motions + points)                          */
/* ------------------------------------------------------------------ */

export async function raiseFwcFloorRequest(input: {
  conferenceId: string;
  kind: "motion" | "point";
  code: string;
  details?: RopMotionDetail & { note?: string };
  actingAllocationId?: string | null;
}): Promise<FwcResult<{ id: string }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, {
    actingAllocationId: input.actingAllocationId,
    requireSeat: true,
  });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = actor.seat!;
  const state = await stateFor(actor);
  const details = input.details ?? {};

  if (input.kind === "motion") {
    const motion = findRopMotion(FWC_ROP, input.code);
    if (!motion || !motion.delegateRaisable) return { ok: false, error: "That motion is not in order." };
    const session = await loadProcedureSessionStartedAt(actor.db, actor.canonicalConferenceId);
    const phase = session.state === "voting_procedure" ? "voting" : "debate";
    if (!motionAllowedInPhase(motion, phase)) {
      return { ok: false, error: `${motion.label} is only in order during ${motion.phase === "voting" ? "voting procedure" : "debate"}.` };
    }
    if (motion.code === "adjourn" && !state.is_last_session) {
      return { ok: false, error: "Adjournment is only in order during the last session." };
    }
    if (motion.code === "suspend" && state.is_last_session) {
      return { ok: false, error: "Suspend is not in order during the last session — move to adjourn." };
    }
    const missing = missingMotionFields(motion, details);
    if (missing.length) return { ok: false, error: `Add: ${missing.join(", ")}.` };
    const { count } = await actor.db
      .from("fwc_floor_requests")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", actor.canonicalConferenceId)
      .eq("allocation_id", seat.id)
      .eq("kind", "motion")
      .eq("motion_round", state.motion_round)
      .neq("status", "withdrawn");
    if (!canDelegateRaiseMotion(FWC_ROP, count ?? 0)) {
      return { ok: false, error: "You have already raised a motion this round." };
    }
  } else if (!FWC_ROP.points.some((p) => p.code === input.code)) {
    return { ok: false, error: "Unknown point." };
  }

  const { data, error } = await actor.db
    .from("fwc_floor_requests")
    .insert({
      conference_id: actor.canonicalConferenceId,
      allocation_id: seat.id,
      kind: input.kind,
      code: input.code,
      details,
      motion_round: state.motion_round,
      created_by_user_id: actor.userId,
      created_by_role: actor.actorRole,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not raise this." };
  revalidate();
  revalidatePath("/chair/session");
  return { ok: true, data: { id: String(data.id) } };
}

export async function respondFwcFloorRequest(input: {
  conferenceId: string;
  id: string;
  stance: "second" | "object" | "withdraw";
  actingAllocationId?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await resolveFwcActor(input.conferenceId, {
    actingAllocationId: input.actingAllocationId,
    requireSeat: true,
  });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seatId = actor.seat!.id;
  if (!isUuid(input.id)) return { ok: false, error: "Invalid request id." };
  const { data: row } = await actor.db
    .from("fwc_floor_requests")
    .select("id, allocation_id, kind, status, seconds, objections")
    .eq("id", input.id)
    .eq("conference_id", actor.canonicalConferenceId)
    .maybeSingle();
  if (!row || row.status !== "pending") return { ok: false, error: "This request is no longer open." };
  if (input.stance === "withdraw") {
    if (row.allocation_id !== seatId) return { ok: false, error: "Only the delegate who raised it can withdraw." };
    await actor.db.from("fwc_floor_requests").update({ status: "withdrawn", resolved_at: new Date().toISOString() }).eq("id", row.id);
  } else {
    if (row.kind !== "motion") return { ok: false, error: "Only motions take seconds and objections." };
    if (row.allocation_id === seatId) return { ok: false, error: "You cannot second or object to your own motion." };
    const seconds = new Set<string>((row.seconds as string[]) ?? []);
    const objections = new Set<string>((row.objections as string[]) ?? []);
    seconds.delete(seatId);
    objections.delete(seatId);
    (input.stance === "second" ? seconds : objections).add(seatId);
    await actor.db
      .from("fwc_floor_requests")
      .update({ seconds: [...seconds], objections: [...objections] })
      .eq("id", row.id);
  }
  revalidate();
  revalidatePath("/chair/session");
  return { ok: true, data: null };
}

export async function resolveFwcFloorRequest(input: {
  conferenceId: string;
  id: string;
  decision: "accept" | "pass_unopposed" | "reject" | "resolved";
  note?: string | null;
  /** Conference row the chair console runs on. */
  voteConferenceId?: string | null;
}): Promise<FwcResult<{ voteItemId: string | null }>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  if (!isUuid(input.id)) return { ok: false, error: "Invalid request id." };
  const { data: row } = await actor.db
    .from("fwc_floor_requests")
    .select("id, allocation_id, kind, code, details, status, seconds, objections")
    .eq("id", input.id)
    .eq("conference_id", actor.canonicalConferenceId)
    .maybeSingle();
  if (!row || row.status !== "pending") return { ok: false, error: "This request is no longer open." };
  const now = new Date().toISOString();

  if (input.decision === "reject" || input.decision === "resolved") {
    await actor.db
      .from("fwc_floor_requests")
      .update({ status: input.decision === "reject" ? "rejected" : "resolved", chair_note: clean(input.note, 1000), resolved_at: now })
      .eq("id", row.id);
    revalidate();
    return { ok: true, data: { voteItemId: null } };
  }
  if (row.kind !== "motion") return { ok: false, error: "Points are resolved, not voted on." };
  const motion = findRopMotion(FWC_ROP, String(row.code));
  if (!motion) return { ok: false, error: "Unknown motion." };
  const seconds = ((row.seconds as string[]) ?? []).length;
  const objections = ((row.objections as string[]) ?? []).length;
  if (input.decision === "pass_unopposed" && !motionPassesUnopposed(FWC_ROP, seconds, objections)) {
    return { ok: false, error: `Needs at least ${FWC_ROP.motionRules.autoPassMinSeconds} seconds and no objections to pass without a vote.` };
  }
  const voteConferenceId =
    input.voteConferenceId && actor.siblingConferenceIds.includes(input.voteConferenceId)
      ? input.voteConferenceId
      : actor.canonicalConferenceId;
  const d = (row.details ?? {}) as RopMotionDetail;
  const titleBits = [motion.label, d.topic, d.target, d.totalMinutes ? `${d.totalMinutes} min` : null, d.speakerSeconds ? `${d.speakerSeconds}s speakers` : null]
    .filter(Boolean)
    .join(" · ");
  const { data: vote, error } = await actor.db
    .from("vote_items")
    .insert({
      conference_id: voteConferenceId,
      vote_type: "motion",
      procedure_code: motion.code,
      title: titleBits,
      description: d.topic ?? null,
      required_majority: ropMotionMajority(FWC_ROP, motion.code),
      must_vote: !FWC_ROP.motionRules.motionsAllowAbstain,
      open_for_voting: false,
      motioner_allocation_id: row.allocation_id,
    })
    .select("id")
    .single();
  if (error || !vote) return { ok: false, error: error?.message ?? "Could not put the motion to the floor." };
  if (input.decision === "pass_unopposed") {
    await actor.db.from("vote_items").update({ closed_at: now }).eq("id", vote.id);
    await actor.db.from("vote_items").update({ outcome: "passed", outcome_recorded_at: now }).eq("id", vote.id);
  }
  await actor.db
    .from("fwc_floor_requests")
    .update({ status: "accepted", vote_item_id: vote.id, chair_note: clean(input.note, 1000), resolved_at: now })
    .eq("id", row.id);
  revalidate();
  revalidatePath("/chair/session");
  return { ok: true, data: { voteItemId: String(vote.id) } };
}

export async function advanceFwcMotionRound(input: { conferenceId: string }): Promise<FwcResult<{ round: number }>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const state = await stateFor(actor);
  const round = state.motion_round + 1;
  await actor.db
    .from("fwc_floor_requests")
    .update({ status: "rejected", chair_note: "Motion round closed", resolved_at: new Date().toISOString() })
    .eq("conference_id", actor.canonicalConferenceId)
    .eq("kind", "motion")
    .eq("status", "pending");
  const { error } = await actor.db
    .from("fwc_session_state")
    .update({ motion_round: round, updated_at: new Date().toISOString() })
    .eq("conference_id", actor.canonicalConferenceId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: { round } };
}

/* ------------------------------------------------------------------ */
/* End of day + results                                                */
/* ------------------------------------------------------------------ */

export async function announceFwcDayOutcome(input: {
  conferenceId: string;
  crisisDay: number;
  winningCabinet: string | null;
  summary?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await staffActor(input.conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const day = Math.max(1, Math.floor(Number(input.crisisDay) || 1));
  const cabinet = input.winningCabinet
    ? FWC_ROP.crisis!.cabinets.find((c) => c.key === input.winningCabinet) ?? null
    : null;
  if (input.winningCabinet && !cabinet) return { ok: false, error: "Unknown cabinet." };
  const now = new Date().toISOString();
  const { error } = await actor.db.from("fwc_day_outcomes").upsert(
    {
      conference_id: actor.canonicalConferenceId,
      crisis_day: day,
      winning_cabinet: cabinet?.key ?? null,
      summary: clean(input.summary, 4000),
      announced_at: now,
      announced_by: actor.userId,
    },
    { onConflict: "conference_id,crisis_day" }
  );
  if (error) return { ok: false, error: error.message };
  await publishFwcFeed(actor, {
    kind: "day_result",
    title: cabinet ? `Day ${day}: ${cabinet.label} wins` : `Day ${day} results`,
    body: input.summary,
    crisisDay: day,
  });
  revalidate();
  return { ok: true, data: null };
}

export type FwcResultsRow = {
  allocationId: string;
  name: string;
  cabinet: string | null;
  overall: { submitted: number; approved: number; partial: number; rejected: number; rate: number };
  byDay: Record<number, { submitted: number; approved: number; partial: number; rejected: number; rate: number }>;
};

export async function loadFwcResults(conferenceId: string): Promise<FwcResult<{ rows: FwcResultsRow[] }>> {
  const actorRes = await staffActor(conferenceId);
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  const { data } = await actor.db
    .from("fwc_directives")
    .select("submitter_allocation_id, co_submitter_allocation_ids, approval_status, crisis_day")
    .eq("conference_id", actor.canonicalConferenceId);
  const stats = delegateSuccessStats(
    (data ?? []).map((r) => ({
      allocationIds: [r.submitter_allocation_id as string, ...((r.co_submitter_allocation_ids as string[]) ?? [])].filter(Boolean),
      status: String(r.approval_status),
      crisisDay: (r.crisis_day as number | null) ?? null,
    }))
  );
  const rows: FwcResultsRow[] = seats
    .filter((s) => isFwcCharacterSeat(s.country))
    .map((s) => {
      const st = stats.byDelegate[s.id];
      const character = findCharacter(FWC_ROP, s.country);
      return {
        allocationId: s.id,
        name: lookupFwcCharacter(s.country ?? "")?.displayName ?? String(s.country),
        cabinet: character?.cabinet ?? null,
        overall: st?.overall ?? { submitted: 0, approved: 0, partial: 0, rejected: 0, rate: 0 },
        byDay: st?.byDay ?? {},
      };
    })
    .sort((a, b) => b.overall.rate - a.overall.rate || a.name.localeCompare(b.name));
  return { ok: true, data: { rows } };
}
