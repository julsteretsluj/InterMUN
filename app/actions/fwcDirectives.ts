// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { FWC_ROP } from "@/lib/rop";
import {
  describeDirectiveError,
  directiveSubmitBlocker,
  findDirectiveType,
  nextDirectiveStatus,
  ROP_DIRECTIVE_EDITABLE,
  validateDirectiveForSubmit,
  type DirectiveAction,
} from "@/lib/rop/directives";
import {
  citationAuthors,
  citationSummary,
  describeCitationError,
  normalizeCitations,
  findCharacter,
  validateCitations,
  type CitationAuthor,
  type CitationRef,
  type PowerUse,
} from "@/lib/rop/crisis";
import type { RopDirectiveStatus, RopDirectiveTypeDef } from "@/lib/rop/types";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import {
  isFwcCharacterSeat,
  isUuid,
  loadFwcChamberSeats,
  resolveFwcActor,
  type FwcActor,
  type FwcResult,
  type FwcSeat,
} from "@/lib/fwc/actor";
import {
  cabinetForCountry,
  countersFrom,
  ensureFwcRopState,
  loadActiveCrisisUpdate,
  loadDirectiveBlockingStatus,
  loadProcedureSessionStartedAt,
  logFwcDirectiveEvent,
  publishFwcFeed,
} from "@/lib/fwc/rop-state";

export type FwcDirectiveSignature = {
  allocation_id: string;
  status: "pending" | "signed" | "declined";
  responded_at: string | null;
};

export type FwcDirectiveEvent = {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  internal: boolean;
  actor_role: string | null;
  acting_allocation_id: string | null;
  created_at: string;
};

export type FwcWorkspaceDirective = {
  id: string;
  title: string;
  directive_type: string;
  approval_status: RopDirectiveStatus;
  submitter_allocation_id: string | null;
  co_submitter_allocation_ids: string[];
  request_body: string;
  character_power: string | null;
  power_key: string | null;
  assets: string | null;
  /** Cited character powers / assets ({allocation_id, key}) from the character sheets. */
  invoked_powers: { allocation_id: string; key: string }[];
  invoked_assets: { allocation_id: string; key: string }[];
  resource: string | null;
  reason: string | null;
  target_grid: string | null;
  anonymity_status: "active" | "inactive";
  visibility: "authors" | "committee";
  response_to_author: string | null;
  public_outcome: string | null;
  published_at: string | null;
  cabinet_key: string | null;
  is_final: boolean;
  crisis_day: number | null;
  crisis_session: number | null;
  vote_item_id: string | null;
  floor_outcome: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_by_role: string | null;
  acting_for_allocation_id: string | null;
  evaluation: unknown;
  created_at: string;
  updated_at: string;
  signatures: FwcDirectiveSignature[];
  events: FwcDirectiveEvent[];
  /** Viewer is the lead author. */
  isMine: boolean;
  /** Viewer is a co-signer / sponsor. */
  isCoAuthor: boolean;
};

const DIRECTIVE_COLUMNS =
  "id, conference_id, title, directive_type, approval_status, submitter_allocation_id, co_submitter_allocation_ids, request_body, character_power, power_key, assets, invoked_powers, invoked_assets, resource, reason, target_grid, anonymity_status, visibility, response_to_author, public_outcome, published_at, cabinet_key, is_final, crisis_day, crisis_session, vote_item_id, floor_outcome, submitted_at, reviewed_at, created_by_role, acting_for_allocation_id, evaluation, created_at, updated_at";

type DirectiveDbRow = Omit<FwcWorkspaceDirective, "signatures" | "events" | "isMine" | "isCoAuthor"> & {
  conference_id: string;
};

const PATHS = ["/fwc/directives", "/fwc/crisis", "/chair/fwc/backroom", "/chair/fwc/control"] as const;

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

function clean(v: string | null | undefined, max = 4000): string | null {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
}

async function loadDirective(actor: FwcActor, directiveId: string): Promise<FwcResult<DirectiveDbRow>> {
  if (!isUuid(directiveId)) return { ok: false, error: "Invalid directive id." };
  const { data, error } = await actor.db
    .from("fwc_directives")
    .select(DIRECTIVE_COLUMNS)
    .eq("id", directiveId)
    .eq("conference_id", actor.canonicalConferenceId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Directive not found." };
  return { ok: true, data: data as unknown as DirectiveDbRow };
}

function typeOf(row: { directive_type: string }): RopDirectiveTypeDef | null {
  return findDirectiveType(FWC_ROP, row.directive_type);
}

async function transition(
  actor: FwcActor,
  row: DirectiveDbRow,
  action: DirectiveAction,
  patch: Record<string, unknown>,
  event: { action: string; note?: string | null; internal?: boolean }
): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const type = typeOf(row);
  if (!type) return { ok: false, error: "Unknown directive type." };
  const next = nextDirectiveStatus(type, row.approval_status, action);
  if (!next.ok) return { ok: false, error: next.error };
  const { data, error } = await actor.db
    .from("fwc_directives")
    .update({ ...patch, approval_status: next.status, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("approval_status", row.approval_status)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This directive changed in the meantime. Refresh and try again." };
  await logFwcDirectiveEvent(actor, {
    directiveId: row.id,
    action: event.action,
    fromStatus: row.approval_status,
    toStatus: next.status,
    note: event.note,
    internal: event.internal,
  });
  return { ok: true, data: { status: next.status } };
}

function isAuthor(actor: FwcActor, row: DirectiveDbRow): boolean {
  return Boolean(actor.seat && row.submitter_allocation_id === actor.seat.id);
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

export async function listFwcDirectiveWorkspace(input: {
  conferenceId: string;
  actingAllocationId?: string | null;
}): Promise<
  FwcResult<{
    canonicalConferenceId: string;
    viewerAllocationId: string | null;
    isStaff: boolean;
    actorRole: string;
    directives: FwcWorkspaceDirective[];
    nameByAllocationId: Record<string, string>;
    countryByAllocationId: Record<string, string | null>;
  }>
> {
  const actorRes = await resolveFwcActor(input.conferenceId, { actingAllocationId: input.actingAllocationId });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  await ensureFwcRopState(actor.db, actor.canonicalConferenceId, seats);

  const { data, error } = await actor.db
    .from("fwc_directives")
    .select(DIRECTIVE_COLUMNS)
    .eq("conference_id", actor.canonicalConferenceId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };

  const viewerId = actor.seat?.id ?? null;
  const rows = ((data ?? []) as unknown as DirectiveDbRow[]).filter((row) => {
    if (actor.isStaff) return row.approval_status !== "draft";
    if (!viewerId) return false;
    if (row.submitter_allocation_id === viewerId) return true;
    if ((row.co_submitter_allocation_ids ?? []).includes(viewerId)) return true;
    return (
      row.visibility === "committee" &&
      !["draft", "awaiting_signatures", "withdrawn"].includes(row.approval_status)
    );
  });

  const ids = rows.map((r) => r.id);
  const [sigRes, evRes] = await Promise.all([
    ids.length
      ? actor.db
          .from("fwc_directive_signatures")
          .select("directive_id, allocation_id, status, responded_at")
          .in("directive_id", ids)
      : Promise.resolve({ data: [] as unknown[] }),
    ids.length
      ? actor.db
          .from("fwc_directive_events")
          .select("id, directive_id, action, from_status, to_status, note, internal, actor_role, acting_allocation_id, created_at")
          .in("directive_id", ids)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const sigByDirective = new Map<string, FwcDirectiveSignature[]>();
  for (const s of (sigRes.data ?? []) as (FwcDirectiveSignature & { directive_id: string })[]) {
    const list = sigByDirective.get(s.directive_id) ?? [];
    list.push({ allocation_id: s.allocation_id, status: s.status, responded_at: s.responded_at });
    sigByDirective.set(s.directive_id, list);
  }
  const evByDirective = new Map<string, FwcDirectiveEvent[]>();
  for (const e of (evRes.data ?? []) as (FwcDirectiveEvent & { directive_id: string })[]) {
    const list = evByDirective.get(e.directive_id) ?? [];
    list.push(e);
    evByDirective.set(e.directive_id, list);
  }

  const directives: FwcWorkspaceDirective[] = rows.map((row) => {
    const isMine = Boolean(viewerId && row.submitter_allocation_id === viewerId);
    const isCoAuthor = Boolean(viewerId && (row.co_submitter_allocation_ids ?? []).includes(viewerId));
    const author = isMine || isCoAuthor;
    const out: FwcWorkspaceDirective = {
      ...row,
      co_submitter_allocation_ids: row.co_submitter_allocation_ids ?? [],
      invoked_powers: row.invoked_powers ?? [],
      invoked_assets: row.invoked_assets ?? [],
      signatures: sigByDirective.get(row.id) ?? [],
      events: (evByDirective.get(row.id) ?? []).filter((e) => actor.isStaff || !e.internal),
      isMine,
      isCoAuthor,
    };
    if (!actor.isStaff) {
      out.evaluation = null;
      if (!author) {
        out.response_to_author = null;
        out.events = [];
        if (row.anonymity_status === "active") {
          out.submitter_allocation_id = null;
          out.co_submitter_allocation_ids = [];
          out.signatures = [];
          out.invoked_powers = [];
          out.invoked_assets = [];
        }
      }
    }
    return out;
  });

  const nameByAllocationId: Record<string, string> = {};
  const countryByAllocationId: Record<string, string | null> = {};
  for (const seat of seats) {
    if (!isFwcCharacterSeat(seat.country)) continue;
    nameByAllocationId[seat.id] = lookupFwcCharacter(seat.country ?? "")?.displayName ?? String(seat.country);
    countryByAllocationId[seat.id] = seat.country;
  }

  return {
    ok: true,
    data: {
      canonicalConferenceId: actor.canonicalConferenceId,
      viewerAllocationId: viewerId,
      isStaff: actor.isStaff,
      actorRole: actor.actorRole,
      directives,
      nameByAllocationId,
      countryByAllocationId,
    },
  };
}

function citationAuthorsFor(
  type: RopDirectiveTypeDef,
  submitter: FwcSeat,
  coAuthorIds: readonly string[],
  seats: readonly FwcSeat[]
): CitationAuthor[] {
  const co = coAuthorIds
    .map((id) => seats.find((s) => s.id === id))
    .filter((s): s is FwcSeat => Boolean(s))
    .map((s) => ({ allocationId: s.id, country: s.country }));
  return citationAuthors(type, { allocationId: submitter.id, country: submitter.country }, co);
}

async function loadPowerUses(
  actor: FwcActor,
  allocationIds: readonly string[]
): Promise<Record<string, Record<string, PowerUse[]>>> {
  const out: Record<string, Record<string, PowerUse[]>> = {};
  if (!allocationIds.length) return out;
  const { data } = await actor.db
    .from("fwc_power_uses")
    .select("allocation_id, power_key, crisis_day, crisis_session, mod_caucus_index")
    .eq("conference_id", actor.canonicalConferenceId)
    .in("allocation_id", [...allocationIds])
    .eq("voided", false);
  for (const u of data ?? []) {
    ((out[String(u.allocation_id)] ??= {})[String(u.power_key)] ??= []).push({
      crisisDay: Number(u.crisis_day),
      crisisSession: Number(u.crisis_session),
      modCaucusIndex: Number(u.mod_caucus_index),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Author actions                                                      */
/* ------------------------------------------------------------------ */

export type FwcDirectiveDraftInput = {
  conferenceId: string;
  actingAllocationId?: string | null;
  directiveId?: string | null;
  typeKey: string;
  title: string;
  request?: string | null;
  /** Powers/assets from the eligible authors' character sheets. */
  invokedPowers?: CitationRef[];
  invokedAssets?: CitationRef[];
  resource?: string | null;
  reason?: string | null;
  targetGrid?: string | null;
  anonymity?: boolean;
  coAuthorAllocationIds?: string[];
  isFinal?: boolean;
};

export async function saveFwcDirectiveDraft(
  input: FwcDirectiveDraftInput
): Promise<FwcResult<{ directiveId: string }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, {
    actingAllocationId: input.actingAllocationId,
    requireSeat: true,
  });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = actor.seat!;

  const type = findDirectiveType(FWC_ROP, input.typeKey);
  if (!type) return { ok: false, error: "Unknown directive type." };
  const title = clean(input.title, 200);
  if (!title) return { ok: false, error: "Give the directive a title." };

  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  const characterIds = new Set(seats.filter((s) => isFwcCharacterSeat(s.country)).map((s) => s.id));
  const coAuthors = [...new Set((input.coAuthorAllocationIds ?? []).filter((id) => isUuid(id) && id !== seat.id))];
  if (coAuthors.some((id) => !characterIds.has(id))) {
    return { ok: false, error: "Every co-author must be an FWC character in this committee." };
  }
  if (type.maxAuthors === 1 && coAuthors.length > 0) {
    return { ok: false, error: `${type.label}s are written by one delegate.` };
  }
  const isFinal = Boolean(input.isFinal) && FWC_ROP.directives?.finalDirective?.typeKey === type.key;

  const request = clean(input.request, 6000) ?? "";
  const authors = citationAuthorsFor(type, seat, coAuthors, seats);
  const invokedPowers = normalizeCitations(input.invokedPowers);
  const invokedAssets = normalizeCitations(input.invokedAssets);
  const citationErrors = validateCitations(FWC_ROP, {
    typeKey: type.key,
    authors,
    powers: invokedPowers,
    assets: invokedAssets,
  });
  if (citationErrors.length) return { ok: false, error: citationErrors.map(describeCitationError).join(" ") };
  const pooled = authors.length > 1;
  const ownerOf = (id: string) => (lookupFwcCharacter(seats.find((x) => x.id === id)?.country ?? "")?.displayName ?? null);
  const characterOf = (id: string) => findCharacter(FWC_ROP, seats.find((x) => x.id === id)?.country);
  const characterPower = citationSummary(
    invokedPowers,
    (r) => characterOf(r.allocationId)?.powers.find((x) => x.key === r.key)?.label ?? null,
    ownerOf,
    pooled
  );
  const assets = citationSummary(
    invokedAssets,
    (r) => characterOf(r.allocationId)?.assets.find((x) => x.key === r.key)?.label ?? null,
    ownerOf,
    pooled
  );
  const resource = clean(input.resource, 1000);
  const fields = {
    title,
    request_body: request,
    character_power: characterPower,
    power_key: invokedPowers.find((r) => r.allocationId === seat.id)?.key ?? null,
    invoked_powers: invokedPowers.map((r) => ({ allocation_id: r.allocationId, key: r.key })),
    invoked_assets: invokedAssets.map((r) => ({ allocation_id: r.allocationId, key: r.key })),
    assets,
    resource,
    reason: clean(input.reason, 2000),
    target_grid: clean(input.targetGrid, 20),
    anonymity_status: input.anonymity && type.anonymityAllowed ? "active" : "inactive",
    co_submitter_allocation_ids: coAuthors,
    directive_type: type.key,
    visibility: type.visibility,
    is_final: isFinal,
    cabinet_key: cabinetForCountry(seat.country),
    assets_and_powers: {
      summary: [characterPower, assets].filter(Boolean).join(" · "),
      character_power: characterPower,
      assets,
      resource,
    },
  };

  let directiveId = input.directiveId ?? null;
  if (directiveId) {
    const existing = await loadDirective(actor, directiveId);
    if (!existing.ok) return existing;
    if (!isAuthor(actor, existing.data)) return { ok: false, error: "Only the lead author can edit this directive." };
    if (!ROP_DIRECTIVE_EDITABLE.includes(existing.data.approval_status)) {
      return { ok: false, error: "This directive can no longer be edited." };
    }
    const { error } = await actor.db
      .from("fwc_directives")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", directiveId);
    if (error) return { ok: false, error: error.message };
    await logFwcDirectiveEvent(actor, { directiveId, action: "edited" });
  } else {
    const { data, error } = await actor.db
      .from("fwc_directives")
      .insert({
        ...fields,
        conference_id: actor.canonicalConferenceId,
        submitter_allocation_id: seat.id,
        approval_status: "draft",
        created_by_user_id: actor.userId,
        created_by_role: actor.actorRole,
        acting_for_allocation_id: actor.actingAllocationId,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Could not save the draft." };
    directiveId = String(data.id);
    await logFwcDirectiveEvent(actor, { directiveId, action: "drafted", toStatus: "draft" });
  }

  // Keep signature rows in step with the co-author list.
  const { data: sigRows } = await actor.db
    .from("fwc_directive_signatures")
    .select("allocation_id")
    .eq("directive_id", directiveId);
  const existingSigs = new Set((sigRows ?? []).map((r) => String(r.allocation_id)));
  const toRemove = [...existingSigs].filter((id) => !coAuthors.includes(id));
  const toAdd = coAuthors.filter((id) => !existingSigs.has(id));
  if (toRemove.length) {
    await actor.db.from("fwc_directive_signatures").delete().eq("directive_id", directiveId).in("allocation_id", toRemove);
  }
  if (toAdd.length && type.coAuthorsMustSign) {
    await actor.db
      .from("fwc_directive_signatures")
      .insert(toAdd.map((allocation_id) => ({ directive_id: directiveId, allocation_id })));
  }

  revalidate();
  return { ok: true, data: { directiveId: directiveId! } };
}

export async function submitFwcDirectiveForReview(input: {
  conferenceId: string;
  directiveId: string;
  actingAllocationId?: string | null;
}): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, {
    actingAllocationId: input.actingAllocationId,
    requireSeat: true,
  });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = actor.seat!;

  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  const row = rowRes.data;
  if (!isAuthor(actor, row)) return { ok: false, error: "Only the lead author can submit this directive." };
  const type = typeOf(row);
  if (!type) return { ok: false, error: "Unknown directive type." };

  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  const state = await ensureFwcRopState(actor.db, actor.canonicalConferenceId, seats);
  const counters = countersFrom(state);
  const anonymity = row.anonymity_status === "active";

  if (anonymity && !lookupFwcCharacter(seat.country ?? "")?.anonymityEligible) {
    return { ok: false, error: "Your character cannot use anonymity." };
  }
  let anonymityUses = 0;
  if (anonymity) {
    const { count } = await actor.db
      .from("fwc_directives")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", actor.canonicalConferenceId)
      .eq("submitter_allocation_id", seat.id)
      .eq("anonymity_status", "active")
      .eq("crisis_day", counters.crisisDay)
      .eq("crisis_session", counters.crisisSession)
      .not("approval_status", "in", "(draft,withdrawn)")
      .neq("id", row.id);
    anonymityUses = count ?? 0;
  }

  const errors = validateDirectiveForSubmit(FWC_ROP, {
    typeKey: type.key,
    fields: {
      title: row.title,
      request: row.request_body,
      characterPower: row.character_power,
      assets: row.assets,
      resource: row.resource,
      reason: row.reason,
      targetGrid: row.target_grid,
    },
    authorCount: 1 + (row.co_submitter_allocation_ids ?? []).length,
    anonymity,
    anonymityUsesThisSession: anonymityUses,
  });
  if (errors.length) return { ok: false, error: errors.map((e) => describeDirectiveError(e, type)).join(" ") };

  const [activeCrisis, blockedByStatus, session] = await Promise.all([
    loadActiveCrisisUpdate(actor.db, actor.canonicalConferenceId),
    loadDirectiveBlockingStatus(actor.db, actor.canonicalConferenceId, seat.id),
    loadProcedureSessionStartedAt(actor.db, actor.canonicalConferenceId),
  ]);
  let finalsThisDay = 0;
  if (row.is_final && row.cabinet_key) {
    const { count } = await actor.db
      .from("fwc_directives")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", actor.canonicalConferenceId)
      .eq("is_final", true)
      .eq("cabinet_key", row.cabinet_key)
      .eq("crisis_day", counters.crisisDay)
      .not("approval_status", "in", "(draft,withdrawn,rejected)")
      .neq("id", row.id);
    finalsThisDay = count ?? 0;
  }
  const blocker = directiveSubmitBlocker(FWC_ROP, type, {
    activeCrisis: Boolean(activeCrisis?.is_breach),
    blockedByStatus,
    sessionRunning: Boolean(session.startedAt),
    isFinal: row.is_final,
    finalsThisDayForCabinet: finalsThisDay,
  });
  if (blocker) return { ok: false, error: blocker };

  const authors = citationAuthorsFor(type, seat, row.co_submitter_allocation_ids ?? [], seats);
  const citationErrors = validateCitations(FWC_ROP, {
    typeKey: type.key,
    authors,
    powers: normalizeCitations(row.invoked_powers),
    assets: normalizeCitations(row.invoked_assets),
    usesByAllocation: await loadPowerUses(actor, authors.map((a) => a.allocationId)),
    counters,
    checkAvailability: true,
  });
  if (citationErrors.length) return { ok: false, error: citationErrors.map(describeCitationError).join(" ") };

  const { data: sigs } = await actor.db
    .from("fwc_directive_signatures")
    .select("status")
    .eq("directive_id", row.id);
  const signaturesComplete =
    !type.coAuthorsMustSign || ((sigs ?? []).length > 0 && (sigs ?? []).every((s) => s.status === "signed"));

  const result = await transition(
    actor,
    row,
    { kind: "submit", signaturesComplete },
    {
      submitted_at: new Date().toISOString(),
      crisis_day: counters.crisisDay,
      crisis_session: counters.crisisSession,
      crisis_update_id: activeCrisis?.id ?? null,
      visibility: type.visibility,
    },
    { action: row.approval_status === "needs_revision" ? "resubmitted" : "submitted" }
  );
  if (!result.ok) return result;

  if (anonymity) {
    await actor.db
      .from("fwc_character_states")
      .update({ anonymity_used_session: true, updated_at: new Date().toISOString() })
      .eq("conference_id", actor.canonicalConferenceId)
      .eq("allocation_id", seat.id);
  }
  revalidate();
  return result;
}

export async function signFwcDirective(input: {
  conferenceId: string;
  directiveId: string;
  decision: "signed" | "declined";
  note?: string | null;
  actingAllocationId?: string | null;
}): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, {
    actingAllocationId: input.actingAllocationId,
    requireSeat: true,
  });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const seat = actor.seat!;
  if (input.decision !== "signed" && input.decision !== "declined") return { ok: false, error: "Invalid decision." };

  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  const row = rowRes.data;
  if (!(row.co_submitter_allocation_ids ?? []).includes(seat.id)) {
    return { ok: false, error: "You are not a co-author on this directive." };
  }
  if (row.approval_status !== "awaiting_signatures" && row.approval_status !== "draft") {
    return { ok: false, error: "Signatures are closed for this directive." };
  }

  const { error } = await actor.db
    .from("fwc_directive_signatures")
    .upsert(
      {
        directive_id: row.id,
        allocation_id: seat.id,
        status: input.decision,
        responded_at: new Date().toISOString(),
        responded_by_user_id: actor.userId,
      },
      { onConflict: "directive_id,allocation_id" }
    );
  if (error) return { ok: false, error: error.message };

  if (input.decision === "declined" && row.approval_status === "awaiting_signatures") {
    const res = await transition(actor, row, { kind: "recall" }, {}, { action: "declined", note: input.note });
    revalidate();
    return res;
  }
  await logFwcDirectiveEvent(actor, { directiveId: row.id, action: input.decision, note: input.note });

  if (row.approval_status === "awaiting_signatures") {
    const { data: sigs } = await actor.db
      .from("fwc_directive_signatures")
      .select("status")
      .eq("directive_id", row.id);
    if ((sigs ?? []).every((s) => s.status === "signed")) {
      const res = await transition(actor, row, { kind: "signatures_complete" }, {}, { action: "signatures_complete" });
      revalidate();
      return res;
    }
  }
  revalidate();
  return { ok: true, data: { status: row.approval_status } };
}

export async function recallFwcDirective(input: {
  conferenceId: string;
  directiveId: string;
  mode: "recall" | "withdraw";
  actingAllocationId?: string | null;
}): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { actingAllocationId: input.actingAllocationId });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  if (!isAuthor(actor, rowRes.data) && !(actor.isStaff && input.mode === "withdraw")) {
    return { ok: false, error: "Only the lead author can do this." };
  }
  const res = await transition(
    actor,
    rowRes.data,
    { kind: input.mode === "recall" ? "recall" : "withdraw" },
    {},
    { action: input.mode === "recall" ? "recalled" : "withdrawn" }
  );
  revalidate();
  return res;
}

export async function deleteFwcDirectiveDraft(input: {
  conferenceId: string;
  directiveId: string;
  actingAllocationId?: string | null;
}): Promise<FwcResult<null>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { actingAllocationId: input.actingAllocationId });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  if (!isAuthor(actor, rowRes.data)) return { ok: false, error: "Only the lead author can delete a draft." };
  if (rowRes.data.approval_status !== "draft") return { ok: false, error: "Only drafts can be deleted." };
  const { error } = await actor.db.from("fwc_directives").delete().eq("id", rowRes.data.id).eq("approval_status", "draft");
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/* Dais actions                                                        */
/* ------------------------------------------------------------------ */

/** Spend every cited power once the directive is approved (never on submit). */
async function recordPowerUseFor(actor: FwcActor, row: DirectiveDbRow): Promise<void> {
  const cited = normalizeCitations(row.invoked_powers);
  if (!cited.length && row.power_key && row.submitter_allocation_id) {
    cited.push({ allocationId: row.submitter_allocation_id, key: row.power_key });
  }
  if (!cited.length) return;
  const { data: existing } = await actor.db
    .from("fwc_power_uses")
    .select("allocation_id, power_key")
    .eq("directive_id", row.id)
    .eq("voided", false);
  const done = new Set((existing ?? []).map((u) => `${u.allocation_id}:${u.power_key}`));
  const todo = cited.filter((r) => !done.has(`${r.allocationId}:${r.key}`));
  if (!todo.length) return;
  const { data: state } = await actor.db
    .from("fwc_session_state")
    .select("crisis_day, crisis_session, mod_caucus_count")
    .eq("conference_id", actor.canonicalConferenceId)
    .maybeSingle();
  await actor.db.from("fwc_power_uses").insert(
    todo.map((r) => ({
      conference_id: actor.canonicalConferenceId,
      allocation_id: r.allocationId,
      power_key: r.key,
      crisis_day: Number(state?.crisis_day ?? row.crisis_day ?? 1),
      crisis_session: Number(state?.crisis_session ?? row.crisis_session ?? 1),
      mod_caucus_index: Number(state?.mod_caucus_count ?? 0),
      directive_id: row.id,
      recorded_by: actor.userId,
    }))
  );
}

async function publishOutcome(
  actor: FwcActor,
  row: DirectiveDbRow,
  text: string,
  nameByAllocationId?: Record<string, string>
): Promise<FwcResult<null>> {
  const type = typeOf(row);
  const isPress = row.directive_type === "press_release";
  const byline =
    row.anonymity_status === "active" || !row.submitter_allocation_id
      ? "Anonymous"
      : (nameByAllocationId?.[row.submitter_allocation_id] ?? null);
  const { error } = await publishFwcFeed(actor, {
    kind: isPress ? "press_release" : "directive_outcome",
    title: isPress ? row.title : `${type?.label ?? "Directive"}: ${row.title}`,
    body: byline && isPress ? `${text}\n\n— ${byline}` : text,
    directiveId: row.id,
    crisisDay: row.crisis_day,
  });
  if (error) return { ok: false, error };
  await actor.db
    .from("fwc_directives")
    .update({ public_outcome: text, published_at: new Date().toISOString() })
    .eq("id", row.id);
  await logFwcDirectiveEvent(actor, { directiveId: row.id, action: "published", note: text });
  return { ok: true, data: null };
}

async function chamberNames(actor: FwcActor): Promise<Record<string, string>> {
  const seats = await loadFwcChamberSeats(actor.db, actor.siblingConferenceIds, actor.canonicalConferenceId);
  const out: Record<string, string> = {};
  for (const s of seats) {
    const c = lookupFwcCharacter(s.country ?? "");
    if (c) out[s.id] = c.displayName;
  }
  return out;
}

export async function reviewFwcDirective(input: {
  conferenceId: string;
  directiveId: string;
  decision: "approved" | "approved_with_conditions" | "rejected" | "needs_revision";
  responseToAuthor: string;
  publicOutcome?: string | null;
  publish?: boolean;
  internalNote?: string | null;
}): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { requireStaff: true });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const response = clean(input.responseToAuthor, 4000);
  if (!response) return { ok: false, error: "Write a response for the author(s)." };
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  const row = rowRes.data;

  const res = await transition(
    actor,
    row,
    { kind: "review", decision: input.decision },
    {
      response_to_author: response,
      resolution_details: response,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.userId,
    },
    { action: "reviewed", note: response }
  );
  if (!res.ok) return res;
  if (input.internalNote?.trim()) {
    await logFwcDirectiveEvent(actor, { directiveId: row.id, action: "note", note: input.internalNote, internal: true });
  }

  const approved = input.decision === "approved" || input.decision === "approved_with_conditions";
  if (approved) await recordPowerUseFor(actor, row);

  const type = typeOf(row);
  const outcome = clean(input.publicOutcome, 4000);
  const autoPublish = approved && type?.publishOutcomeToFeed;
  if ((input.publish || autoPublish) && (outcome || row.directive_type === "press_release")) {
    const names = await chamberNames(actor);
    const pub = await publishOutcome(actor, row, outcome ?? row.request_body, names);
    if (!pub.ok) return pub;
  }
  revalidate();
  return res;
}

export async function presentFwcDirectiveToFloor(input: {
  conferenceId: string;
  directiveId: string;
  /** Conference row the chair console runs on (defaults to the canonical FWC row). */
  voteConferenceId?: string | null;
}): Promise<FwcResult<{ voteItemId: string }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { requireStaff: true });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  const row = rowRes.data;
  const type = typeOf(row);
  if (!type?.floorVote) return { ok: false, error: "Only cabinet directives go to a floor vote." };
  const voteConferenceId =
    input.voteConferenceId && actor.siblingConferenceIds.includes(input.voteConferenceId)
      ? input.voteConferenceId
      : actor.canonicalConferenceId;

  const { data: vote, error } = await actor.db
    .from("vote_items")
    .insert({
      conference_id: voteConferenceId,
      vote_type: "motion",
      procedure_code: "cabinet_directive",
      title: `Cabinet directive: ${row.title}`,
      description: row.request_body,
      required_majority: type.floorVote.majority,
      must_vote: true,
      open_for_voting: false,
      motioner_allocation_id: row.submitter_allocation_id,
    })
    .select("id")
    .single();
  if (error || !vote) return { ok: false, error: error?.message ?? "Could not create the floor vote." };

  const res = await transition(
    actor,
    row,
    { kind: "present_to_floor" },
    { vote_item_id: vote.id },
    { action: "presented_to_floor" }
  );
  if (!res.ok) {
    await actor.db.from("vote_items").delete().eq("id", vote.id);
    return res;
  }
  revalidate();
  revalidatePath("/chair/session");
  return { ok: true, data: { voteItemId: String(vote.id) } };
}

export async function recordFwcDirectiveFloorResult(input: {
  conferenceId: string;
  directiveId: string;
  passed: boolean;
  responseToAuthor?: string | null;
}): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { requireStaff: true });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  const res = await transition(
    actor,
    rowRes.data,
    { kind: "floor_result", passed: input.passed },
    {
      floor_outcome: input.passed ? "passed" : "failed",
      response_to_author: clean(input.responseToAuthor, 4000) ?? rowRes.data.response_to_author,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.userId,
    },
    { action: "floor_result", note: input.passed ? "Passed on the floor" : "Failed on the floor" }
  );
  if (res.ok && input.passed) await recordPowerUseFor(actor, rowRes.data);
  revalidate();
  return res;
}

export async function publishFwcDirectiveOutcome(input: {
  conferenceId: string;
  directiveId: string;
  publicOutcome: string;
}): Promise<FwcResult<null>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { requireStaff: true });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const text = clean(input.publicOutcome, 4000);
  if (!text) return { ok: false, error: "Write the public outcome first." };
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  if (!["approved", "approved_with_conditions", "rejected"].includes(rowRes.data.approval_status)) {
    return { ok: false, error: "Only decided directives can be published." };
  }
  const res = await publishOutcome(actor, rowRes.data, text, await chamberNames(actor));
  revalidate();
  return res;
}

export async function reopenFwcDirective(input: {
  conferenceId: string;
  directiveId: string;
  note?: string | null;
}): Promise<FwcResult<{ status: RopDirectiveStatus }>> {
  const actorRes = await resolveFwcActor(input.conferenceId, { requireStaff: true });
  if (!actorRes.ok) return actorRes;
  const actor = actorRes.data;
  const rowRes = await loadDirective(actor, input.directiveId);
  if (!rowRes.ok) return rowRes;
  const res = await transition(actor, rowRes.data, { kind: "reopen" }, {}, { action: "reopened", note: input.note });
  revalidate();
  return res;
}
