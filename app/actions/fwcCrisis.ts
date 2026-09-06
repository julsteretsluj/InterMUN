// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { getChamberScope } from "@/lib/chamber-scope";
import {
  getCommitteeAwardScope,
  mergeAllocationsAcrossSiblingConferences,
} from "@/lib/conference-committee-canonical";
import { requireFwcCommittee } from "@/lib/crisis-committee";
import { isCommitteeChairSeatLabel, isDaisSeatAllocationCountry } from "@/lib/dais-seat-plan";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import { isFwcTerrainType } from "@/lib/fwc/terrain";
import {
  FWC_ANONYMITY_FORBIDDEN_DIRECTIVE_TYPES,
  FWC_APPROVAL_STATUSES,
  FWC_DIRECTIVE_TYPES,
  FWC_EVALUATION_CRITERIA,
  FWC_METER_KEYS,
  FWC_OVERALL_VERDICTS,
  FWC_POST_MOVEMENT_ACTIONS,
  type FwcAnonymityStatus,
  type FwcApprovalStatus,
  type FwcDirectiveType,
  type FwcEvaluationPayload,
  type FwcMeterKey,
  type FwcMeters,
  type FwcMovementStatus,
  type FwcOverallVerdict,
  type FwcPostMovementAction,
  type FwcTerrainType,
} from "@/lib/fwc/types";
import {
  FWC_EVIDENCE_BUNDLED_XLSX_RELATIVE_PATH,
  FWC_EVIDENCE_LIBRARY,
  FWC_EVIDENCE_SOURCE_FILENAME,
  type FwcEvidenceCatalogItem,
} from "@/lib/fwc/evidence-library";
import { isXlsxUpload, parseFwcEvidenceXlsx } from "@/lib/fwc/parse-evidence-xlsx";
import type {
  FwcEvidenceHolder,
  FwcEvidenceLibraryPayload,
  FwcEvidenceMonitorRow,
  FwcEvidenceSourceMeta,
} from "@/lib/fwc/evidence-types";
import { GUIDE_FILES_BUCKET } from "@/lib/guide-resources";
import { readFile } from "node:fs/promises";
import nodePath from "node:path";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
type Role = "delegate" | "chair" | "smt" | "admin";

type AllocRow = {
  id: string;
  country: string | null;
  user_id: string | null;
  conference_id: string;
};

type CharacterStateRow = {
  allocation_id: string;
  current_grid: string;
  base_mp: number;
  bonus_mp: number;
  anonymity_used_session: boolean;
};

type DirectiveRow = {
  id: string;
  conference_id: string;
  title: string;
  submitter_allocation_id: string | null;
  co_submitter_allocation_ids: string[] | null;
  directive_type: FwcDirectiveType;
  target_grid: string | null;
  request_body: string;
  assets_and_powers: unknown;
  reason: string | null;
  anonymity_status: FwcAnonymityStatus;
  approval_status: FwcApprovalStatus;
  resolution_details: string | null;
  evaluation: unknown;
  created_at: string;
  updated_at: string;
};

export type FwcDirectiveListItem = DirectiveRow;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const METER_RANGES: Record<FwcMeterKey, { min: number; max: number }> = {
  public_panic_exposure: { min: 0, max: 100 },
  dimensional_breach_index: { min: 1, max: 5 },
  hive_strain_spore_density: { min: 0, max: 100 },
  covert_secrecy_index: { min: 0, max: 100 },
  subterranean_footprint: { min: 0, max: 100 },
  subject_control_rating: { min: 0, max: 100 },
};

const DEFAULT_METERS: FwcMeters = {
  public_panic_exposure: 0,
  dimensional_breach_index: 1,
  hive_strain_spore_density: 0,
  covert_secrecy_index: 0,
  subterranean_footprint: 0,
  subject_control_rating: 0,
};

const VERDICT_TO_APPROVAL: Record<FwcOverallVerdict, FwcApprovalStatus> = {
  APPROVED: "approved",
  APPROVED_WITH_CONDITIONS: "approved_with_conditions",
  REJECTED: "rejected",
  NEEDS_REVISION: "needs_revision",
};

const FWC_REVALIDATE_PATHS = [
  "/fwc/directives",
  "/fwc/movement",
  "/fwc/map",
  "/chair/fwc/backroom",
  "/chair/fwc/evidence",
] as const;

const DIRECTIVE_SELECT =
  "id, conference_id, title, submitter_allocation_id, co_submitter_allocation_ids, directive_type, target_grid, request_body, assets_and_powers, reason, anonymity_status, approval_status, resolution_details, evaluation, created_at, updated_at";

/** Static select so PostgREST typing stays a row, not `GenericStringError` from a dynamic join. */
const FWC_METERS_SELECT =
  "public_panic_exposure, dimensional_breach_index, hive_strain_spore_density, covert_secrecy_index, subterranean_footprint, subject_control_rating";

function metersFromRow(row: unknown): FwcMeters {
  const source =
    row && typeof row === "object" && !Array.isArray(row)
      ? (row as Record<string, unknown>)
      : {};
  const next: FwcMeters = { ...DEFAULT_METERS };
  for (const key of FWC_METER_KEYS) {
    const value = Number(source[key] ?? DEFAULT_METERS[key]);
    next[key] = clampMeter(key, Number.isFinite(value) ? value : DEFAULT_METERS[key]);
  }
  return next;
}

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

function isStaff(role: Role | null): boolean {
  return role === "chair" || role === "smt" || role === "admin";
}

function isFwcDirectiveType(value: string): value is FwcDirectiveType {
  return (FWC_DIRECTIVE_TYPES as readonly string[]).includes(value);
}

function isFwcPostMovementAction(value: string): value is FwcPostMovementAction {
  return (FWC_POST_MOVEMENT_ACTIONS as readonly string[]).includes(value);
}

function isCharacterSeat(country: string | null | undefined): boolean {
  if (isDaisSeatAllocationCountry(country) || isCommitteeChairSeatLabel(country)) return false;
  return lookupFwcCharacter(country ?? "") != null;
}

function uniqueUuids(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!isUuid(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function clampMeter(key: FwcMeterKey, value: number): number {
  const { min, max } = METER_RANGES[key];
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function revalidateFwcPaths() {
  for (const path of FWC_REVALIDATE_PATHS) revalidatePath(path);
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as Role | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, role: (profile?.role ?? null) as Role | null };
}

function requireWriteDb(role: Role | null, supabase: SupabaseClient): ActionResult<SupabaseClient> {
  const admin = createAdminClient();
  if (admin) return { ok: true, data: admin };
  if (isStaff(role)) return { ok: true, data: supabase };
  return { ok: false, error: "Server is not configured to write FWC crisis state." };
}

async function chairCanAccessChamber(
  supabase: SupabaseClient,
  userId: string,
  canonicalConferenceId: string,
  siblingConferenceIds: string[]
): Promise<boolean> {
  const { data: seat } = await supabase
    .from("allocations")
    .select("id")
    .in("conference_id", siblingConferenceIds)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (seat?.id) return true;

  const activeConf = await resolveDashboardConferenceForUser("chair", userId);
  if (!activeConf) return false;
  const activeScope = await getCommitteeAwardScope(supabase, activeConf.id);
  return activeScope.canonicalConferenceId === canonicalConferenceId;
}

async function resolveFwcScope(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<
  ActionResult<{
    canonicalConferenceId: string;
    siblingConferenceIds: string[];
  }>
> {
  if (!isUuid(conferenceId)) return { ok: false, error: "Invalid conference id." };

  // FWC has two topic rows; one Hawkins simulation lives on the canonical committee id.
  const [chamber, bundle] = await Promise.all([
    getChamberScope(supabase, conferenceId),
    getResolvedDebateConferenceBundle(supabase, conferenceId),
  ]);
  const canonicalConferenceId = bundle.canonicalConferenceId || chamber.canonicalConferenceId;
  const siblingConferenceIds =
    bundle.siblingConferenceIds.length > 0 ? bundle.siblingConferenceIds : chamber.siblingConferenceIds;

  const fwcErr = requireFwcCommittee(bundle.committeeLabelRaw);
  if (fwcErr) return { ok: false, error: fwcErr };

  return { ok: true, data: { canonicalConferenceId, siblingConferenceIds } };
}

async function loadChamberAllocations(
  db: SupabaseClient,
  siblingConferenceIds: string[],
  canonicalConferenceId: string
): Promise<ActionResult<AllocRow[]>> {
  const { data, error } = await db
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", siblingConferenceIds);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: mergeAllocationsAcrossSiblingConferences(data ?? [], canonicalConferenceId),
  };
}

async function loadUserSeats(
  supabase: SupabaseClient,
  userId: string,
  siblingConferenceIds: string[]
): Promise<ActionResult<AllocRow[]>> {
  const { data, error } = await supabase
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", siblingConferenceIds)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AllocRow[] };
}

function pickCharacterSeat(
  seats: AllocRow[],
  canonicalConferenceId: string,
  existingStateIds?: Set<string>
): AllocRow | null {
  const characters = seats.filter((row) => isCharacterSeat(row.country));
  if (characters.length === 0) return null;
  if (existingStateIds) {
    const withState = characters.find((row) => existingStateIds.has(row.id));
    if (withState) return withState;
  }
  return characters.find((row) => row.conference_id === canonicalConferenceId) ?? characters[0] ?? null;
}

async function userMayAccessFwc(input: {
  supabase: SupabaseClient;
  userId: string;
  role: Role | null;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  requireStaff?: boolean;
}): Promise<ActionResult<{ seats: AllocRow[] }>> {
  if (input.requireStaff && !isStaff(input.role)) {
    return { ok: false, error: "Only chairs and secretariat can do this." };
  }

  const seatsRes = await loadUserSeats(input.supabase, input.userId, input.siblingConferenceIds);
  if (!seatsRes.ok) return seatsRes;
  const seated = seatsRes.data.length > 0;

  if (input.role === "smt" || input.role === "admin") {
    return { ok: true, data: { seats: seatsRes.data } };
  }

  if (input.role === "chair") {
    const allowed =
      seated ||
      (await chairCanAccessChamber(
        input.supabase,
        input.userId,
        input.canonicalConferenceId,
        input.siblingConferenceIds
      ));
    if (!allowed) {
      return { ok: false, error: "Your chair account is not linked to this FWC committee." };
    }
    return { ok: true, data: { seats: seatsRes.data } };
  }

  if (!seated) {
    return { ok: false, error: "You are not seated in this FWC committee." };
  }
  return { ok: true, data: { seats: seatsRes.data } };
}

async function ensureFwcCrisisStateForScope(
  db: SupabaseClient,
  canonicalConferenceId: string,
  siblingConferenceIds: string[]
): Promise<
  ActionResult<{
    metersCreated: boolean;
    characterStatesUpserted: number;
  }>
> {
  const { data: metersRow, error: metersReadErr } = await db
    .from("fwc_meters")
    .select("conference_id")
    .eq("conference_id", canonicalConferenceId)
    .maybeSingle();
  if (metersReadErr) return { ok: false, error: metersReadErr.message };

  let metersCreated = false;
  if (!metersRow) {
    const { error: metersInsErr } = await db.from("fwc_meters").insert({
      conference_id: canonicalConferenceId,
      ...DEFAULT_METERS,
    });
    if (metersInsErr) return { ok: false, error: metersInsErr.message };
    metersCreated = true;
  }

  const allocsRes = await loadChamberAllocations(db, siblingConferenceIds, canonicalConferenceId);
  if (!allocsRes.ok) return allocsRes;

  const characterAllocs = allocsRes.data.filter((row) => isCharacterSeat(row.country));
  if (characterAllocs.length === 0) {
    return { ok: true, data: { metersCreated, characterStatesUpserted: 0 } };
  }

  const { data: existingStates, error: statesReadErr } = await db
    .from("fwc_character_states")
    .select("allocation_id")
    .eq("conference_id", canonicalConferenceId);
  if (statesReadErr) return { ok: false, error: statesReadErr.message };

  const existing = new Set((existingStates ?? []).map((row) => row.allocation_id as string));
  const inserts: Array<{
    conference_id: string;
    allocation_id: string;
    current_grid: string;
    base_mp: number;
    bonus_mp: number;
    anonymity_used_session: boolean;
  }> = [];

  for (const alloc of characterAllocs) {
    if (existing.has(alloc.id)) continue;
    const catalog = lookupFwcCharacter(alloc.country ?? "");
    if (!catalog) continue;
    inserts.push({
      conference_id: canonicalConferenceId,
      allocation_id: alloc.id,
      current_grid: catalog.baseGrid,
      base_mp: catalog.baseMp,
      bonus_mp: catalog.bonusMp,
      anonymity_used_session: false,
    });
  }

  if (inserts.length > 0) {
    const { error: upsertErr } = await db.from("fwc_character_states").upsert(inserts, {
      onConflict: "conference_id,allocation_id",
      ignoreDuplicates: true,
    });
    if (upsertErr) return { ok: false, error: upsertErr.message };
  }

  return { ok: true, data: { metersCreated, characterStatesUpserted: inserts.length } };
}

async function loadCharacterState(
  db: SupabaseClient,
  canonicalConferenceId: string,
  allocationId: string
): Promise<ActionResult<CharacterStateRow>> {
  const { data, error } = await db
    .from("fwc_character_states")
    .select("allocation_id, current_grid, base_mp, bonus_mp, anonymity_used_session")
    .eq("conference_id", canonicalConferenceId)
    .eq("allocation_id", allocationId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No FWC character state for this seat." };
  return { ok: true, data: data as CharacterStateRow };
}

function normalizeAssetsAndPowers(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? { summary: trimmed } : {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function parseEvaluationPayload(raw: FwcEvaluationPayload): ActionResult<FwcEvaluationPayload> {
  const verdict = raw?.overall_verdict;
  if (!verdict || !(FWC_OVERALL_VERDICTS as readonly string[]).includes(verdict)) {
    return { ok: false, error: "Invalid evaluation verdict." };
  }

  const scores = raw.criterion_scores;
  if (!scores || typeof scores !== "object") {
    return { ok: false, error: "Criterion scores are required." };
  }

  const criterion_scores = { realism: 0, spatial: 0, portfolio: 0, narrative: 0, balance: 0 };
  let sum = 0;
  for (const key of FWC_EVALUATION_CRITERIA) {
    const value = Number((scores as Record<string, unknown>)[key]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return { ok: false, error: `Criterion "${key}" must be an integer from 1 to 5.` };
    }
    criterion_scores[key] = value;
    sum += value;
  }

  const sentScore = Number(raw.viability_score);
  if (Number.isFinite(sentScore) && sentScore !== sum) {
    return { ok: false, error: "Viability score must equal the sum of criterion scores (max 25)." };
  }

  const rec = raw.recommended_resolution ?? {
    in_game_time_of_resolution: "",
    evidence_output: "",
    map_and_meter_impact: "",
  };

  return {
    ok: true,
    data: {
      overall_verdict: verdict,
      viability_score: sum,
      criterion_scores,
      strengths: Array.isArray(raw.strengths) ? raw.strengths.map((s) => String(s)) : [],
      realism_and_logistical_flaws: Array.isArray(raw.realism_and_logistical_flaws)
        ? raw.realism_and_logistical_flaws.map((s) => String(s))
        : [],
      recommended_resolution: {
        in_game_time_of_resolution: String(rec.in_game_time_of_resolution ?? ""),
        evidence_output: String(rec.evidence_output ?? ""),
        map_and_meter_impact: String(rec.map_and_meter_impact ?? ""),
      },
      chair_revision_guidance: String(raw.chair_revision_guidance ?? ""),
    },
  };
}

function sortDirectiveQueue(rows: DirectiveRow[]): DirectiveRow[] {
  return [...rows].sort((a, b) => {
    const rank = (row: DirectiveRow) => {
      if (row.approval_status === "pending" && row.directive_type === "rapid_crisis_action") return 0;
      if (row.approval_status === "pending") return 1;
      return 2;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function redactDirectiveForDelegate(row: DirectiveRow, viewerAllocationIds: Set<string>): DirectiveRow {
  const submitter = row.submitter_allocation_id;
  const cos = row.co_submitter_allocation_ids ?? [];
  const isOwner = (submitter && viewerAllocationIds.has(submitter)) || cos.some((id) => viewerAllocationIds.has(id));
  if (isOwner) return row;

  const next: DirectiveRow = { ...row };
  if (row.anonymity_status === "active") {
    next.submitter_allocation_id = null;
    next.co_submitter_allocation_ids = [];
    next.request_body = "";
    next.assets_and_powers = {};
    next.reason = null;
    next.evaluation = null;
  }

  if (row.directive_type === "personal" || row.directive_type === "joint") {
    next.evaluation = null;
    next.resolution_details = null;
  }

  return next;
}

function pickMetersPatch(raw: Partial<FwcMeters> | undefined): Partial<FwcMeters> {
  const patch: Partial<FwcMeters> = {};
  if (!raw) return patch;
  for (const key of FWC_METER_KEYS) {
    if (raw[key] == null) continue;
    const value = Number(raw[key]);
    if (!Number.isFinite(value)) continue;
    patch[key] = clampMeter(key, value);
  }
  return patch;
}

async function applyMeterDeltas(
  db: SupabaseClient,
  canonicalConferenceId: string,
  deltas: Partial<Record<FwcMeterKey, number>> | undefined
): Promise<ActionResult<FwcMeters | null>> {
  if (!deltas) return { ok: true, data: null };
  const hasDelta = FWC_METER_KEYS.some((key) => deltas[key] != null && Number.isFinite(Number(deltas[key])));
  if (!hasDelta) return { ok: true, data: null };

  const { data: current, error: readErr } = await db
    .from("fwc_meters")
    .select(FWC_METERS_SELECT)
    .eq("conference_id", canonicalConferenceId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "FWC meters are not initialized." };

  const baseMeters = metersFromRow(current);
  const next: FwcMeters = { ...DEFAULT_METERS };
  for (const key of FWC_METER_KEYS) {
    const delta = Number(deltas[key] ?? 0);
    next[key] = clampMeter(key, baseMeters[key] + (Number.isFinite(delta) ? delta : 0));
  }

  const { data: updated, error: writeErr } = await db
    .from("fwc_meters")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("conference_id", canonicalConferenceId)
    .select(FWC_METERS_SELECT)
    .single();
  if (writeErr || !updated) return { ok: false, error: writeErr?.message ?? "Could not update meters." };
  return { ok: true, data: metersFromRow(updated) };
}

/**
 * If missing, insert `fwc_meters` defaults and upsert `fwc_character_states`
 * for seated character allocations (not dais) from `lookupFwcCharacter`.
 */
export async function ensureFwcCrisisState(conferenceId: string): Promise<
  ActionResult<{
    canonicalConferenceId: string;
    metersCreated: boolean;
    characterStatesUpserted: number;
  }>
> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };

  const scope = await resolveFwcScope(auth.supabase, conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
  });
  if (!access.ok) return access;

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  const ensured = await ensureFwcCrisisStateForScope(
    write.data,
    scope.data.canonicalConferenceId,
    scope.data.siblingConferenceIds
  );
  if (!ensured.ok) return ensured;

  return {
    ok: true,
    data: {
      canonicalConferenceId: scope.data.canonicalConferenceId,
      ...ensured.data,
    },
  };
}

export async function submitFwcDirective(input: {
  conferenceId: string;
  title: string;
  directiveType: FwcDirectiveType;
  requestBody: string;
  reason?: string | null;
  targetGrid?: string | null;
  assetsAndPowers?: unknown;
  anonymity?: boolean;
  coSubmitterAllocationIds?: string[];
  submitterAllocationId?: string;
}): Promise<ActionResult<{ directiveId: string; canonicalConferenceId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };
  if (auth.role !== "delegate" && !isStaff(auth.role)) {
    return { ok: false, error: "Only FWC delegates and chairs can submit directives." };
  }

  const scope = await resolveFwcScope(auth.supabase, input.conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
  });
  if (!access.ok) return access;

  if (!isFwcDirectiveType(input.directiveType)) {
    return { ok: false, error: "Invalid directive type." };
  }

  const title = input.title.trim();
  const requestBody = input.requestBody.trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (!requestBody) return { ok: false, error: "Request body is required." };

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  const ensured = await ensureFwcCrisisStateForScope(
    write.data,
    scope.data.canonicalConferenceId,
    scope.data.siblingConferenceIds
  );
  if (!ensured.ok) return ensured;

  const { data: existingStates } = await write.data
    .from("fwc_character_states")
    .select("allocation_id")
    .eq("conference_id", scope.data.canonicalConferenceId);
  const existingStateIds = new Set((existingStates ?? []).map((row) => row.allocation_id as string));

  let submitter = pickCharacterSeat(access.data.seats, scope.data.canonicalConferenceId, existingStateIds);
  if (!submitter && input.submitterAllocationId && isStaff(auth.role) && isUuid(input.submitterAllocationId)) {
    const chamberAllocs = await loadChamberAllocations(
      write.data,
      scope.data.siblingConferenceIds,
      scope.data.canonicalConferenceId
    );
    if (!chamberAllocs.ok) return chamberAllocs;
    submitter = chamberAllocs.data.find((row) => row.id === input.submitterAllocationId) ?? null;
    if (submitter && !isCharacterSeat(submitter.country) && !isStaff(auth.role)) {
      submitter = null;
    }
  }
  if (!submitter) {
    submitter = access.data.seats.find((row) => row.conference_id === scope.data.canonicalConferenceId) ?? access.data.seats[0] ?? null;
  }
  if (!submitter) {
    return { ok: false, error: "No FWC seat found for your account." };
  }

  const coSubmitterIds = uniqueUuids(input.coSubmitterAllocationIds ?? []).filter((id) => id !== submitter!.id);
  if (input.directiveType === "joint") {
    if (coSubmitterIds.length < 2 || coSubmitterIds.length > 5) {
      return { ok: false, error: "Joint directives need 2–5 co-submitters besides the submitter." };
    }
    const chamberAllocs = await loadChamberAllocations(
      write.data,
      scope.data.siblingConferenceIds,
      scope.data.canonicalConferenceId
    );
    if (!chamberAllocs.ok) return chamberAllocs;
    const byId = new Map(chamberAllocs.data.map((row) => [row.id, row]));
    for (const id of coSubmitterIds) {
      const row = byId.get(id);
      if (!row || !isCharacterSeat(row.country)) {
        return { ok: false, error: "Every joint co-submitter must be a seated FWC character." };
      }
    }
  } else if (coSubmitterIds.length > 0) {
    return { ok: false, error: "Co-submitters are only used on joint directives." };
  }

  const wantAnonymity = Boolean(input.anonymity);
  let anonymityStatus: FwcAnonymityStatus = "inactive";

  if (wantAnonymity) {
    if ((FWC_ANONYMITY_FORBIDDEN_DIRECTIVE_TYPES as readonly FwcDirectiveType[]).includes(input.directiveType)) {
      return { ok: false, error: "Cabinet and Rapid Crisis Actions cannot be anonymized." };
    }
    if (input.directiveType !== "personal" && input.directiveType !== "joint" && input.directiveType !== "press_release") {
      return { ok: false, error: "Anonymity is only available on personal, joint, and press-release directives." };
    }

    const catalog = lookupFwcCharacter(submitter.country ?? "");
    if (!catalog?.anonymityEligible) {
      return { ok: false, error: "This character cannot use anonymity." };
    }

    const state = await loadCharacterState(write.data, scope.data.canonicalConferenceId, submitter.id);
    if (!state.ok) return state;
    if (state.data.anonymity_used_session) {
      return { ok: false, error: "Anonymity can only be used once per session." };
    }
    anonymityStatus = "active";
  }

  if (anonymityStatus === "active") {
    const { data: claimed, error: claimErr } = await write.data
      .from("fwc_character_states")
      .update({ anonymity_used_session: true, updated_at: new Date().toISOString() })
      .eq("conference_id", scope.data.canonicalConferenceId)
      .eq("allocation_id", submitter.id)
      .eq("anonymity_used_session", false)
      .select("allocation_id")
      .maybeSingle();
    if (claimErr) return { ok: false, error: claimErr.message };
    if (!claimed) return { ok: false, error: "Anonymity can only be used once per session." };
  }

  const { data: created, error: insertErr } = await write.data
    .from("fwc_directives")
    .insert({
      conference_id: scope.data.canonicalConferenceId,
      title,
      submitter_allocation_id: submitter.id,
      co_submitter_allocation_ids: coSubmitterIds,
      directive_type: input.directiveType,
      target_grid: input.targetGrid?.trim() || null,
      request_body: requestBody,
      assets_and_powers: normalizeAssetsAndPowers(input.assetsAndPowers),
      reason: input.reason?.trim() || null,
      anonymity_status: anonymityStatus,
      approval_status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !created?.id) {
    if (anonymityStatus === "active") {
      await write.data
        .from("fwc_character_states")
        .update({ anonymity_used_session: false, updated_at: new Date().toISOString() })
        .eq("conference_id", scope.data.canonicalConferenceId)
        .eq("allocation_id", submitter.id);
    }
    return { ok: false, error: insertErr?.message ?? "Could not submit directive." };
  }

  revalidateFwcPaths();
  return {
    ok: true,
    data: { directiveId: created.id, canonicalConferenceId: scope.data.canonicalConferenceId },
  };
}

export async function listFwcDirectives(conferenceId: string): Promise<
  ActionResult<{
    canonicalConferenceId: string;
    directives: FwcDirectiveListItem[];
  }>
> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };

  const scope = await resolveFwcScope(auth.supabase, conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
  });
  if (!access.ok) return access;

  const write = requireWriteDb(auth.role, auth.supabase);
  if (write.ok) {
    await ensureFwcCrisisStateForScope(
      write.data,
      scope.data.canonicalConferenceId,
      scope.data.siblingConferenceIds
    );
  }

  const viewerIds = new Set(access.data.seats.map((row) => row.id));
  const staff = isStaff(auth.role);

  const table = staff ? "fwc_directives" : "fwc_directives_public";
  const { data: rows, error } = await auth.supabase
    .from(table)
    .select(DIRECTIVE_SELECT)
    .eq("conference_id", scope.data.canonicalConferenceId);
  if (error) return { ok: false, error: error.message };

  let merged = (rows ?? []) as DirectiveRow[];

  if (!staff && viewerIds.size > 0) {
    const ownFilter = Array.from(viewerIds);
    const { data: submittedRows, error: submittedErr } = await auth.supabase
      .from("fwc_directives")
      .select(DIRECTIVE_SELECT)
      .eq("conference_id", scope.data.canonicalConferenceId)
      .in("submitter_allocation_id", ownFilter);
    if (submittedErr) return { ok: false, error: submittedErr.message };

    const { data: jointRows, error: jointErr } = await auth.supabase
      .from("fwc_directives")
      .select(DIRECTIVE_SELECT)
      .eq("conference_id", scope.data.canonicalConferenceId)
      .eq("directive_type", "joint");
    if (jointErr) return { ok: false, error: jointErr.message };

    const byId = new Map(merged.map((row) => [row.id, row]));
    for (const row of (submittedRows ?? []) as DirectiveRow[]) {
      byId.set(row.id, row);
    }
    for (const row of (jointRows ?? []) as DirectiveRow[]) {
      const cos = row.co_submitter_allocation_ids ?? [];
      if (cos.some((id) => viewerIds.has(id))) byId.set(row.id, row);
    }
    merged = Array.from(byId.values()).map((row) => redactDirectiveForDelegate(row, viewerIds));
  }

  return {
    ok: true,
    data: {
      canonicalConferenceId: scope.data.canonicalConferenceId,
      directives: sortDirectiveQueue(merged),
    },
  };
}

export async function evaluateFwcDirective(input: {
  conferenceId: string;
  directiveId: string;
  evaluation: FwcEvaluationPayload;
  resolutionDetails?: string | null;
  meterDeltas?: Partial<Record<FwcMeterKey, number>>;
}): Promise<ActionResult<{ directiveId: string; approvalStatus: FwcApprovalStatus }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };

  const scope = await resolveFwcScope(auth.supabase, input.conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
    requireStaff: true,
  });
  if (!access.ok) return access;

  if (!isUuid(input.directiveId)) return { ok: false, error: "Invalid directive id." };

  const parsed = parseEvaluationPayload(input.evaluation);
  if (!parsed.ok) return parsed;

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  const ensured = await ensureFwcCrisisStateForScope(
    write.data,
    scope.data.canonicalConferenceId,
    scope.data.siblingConferenceIds
  );
  if (!ensured.ok) return ensured;

  const approvalStatus = VERDICT_TO_APPROVAL[parsed.data.overall_verdict];
  if (!(FWC_APPROVAL_STATUSES as readonly string[]).includes(approvalStatus)) {
    return { ok: false, error: "Invalid approval status." };
  }

  const { data: updated, error } = await write.data
    .from("fwc_directives")
    .update({
      evaluation: parsed.data,
      approval_status: approvalStatus,
      resolution_details: input.resolutionDetails?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.directiveId)
    .eq("conference_id", scope.data.canonicalConferenceId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated?.id) return { ok: false, error: "Directive not found." };

  const meters = await applyMeterDeltas(write.data, scope.data.canonicalConferenceId, input.meterDeltas);
  if (!meters.ok) return meters;

  revalidateFwcPaths();
  return { ok: true, data: { directiveId: updated.id, approvalStatus } };
}

export async function queueFwcMovement(input: {
  conferenceId: string;
  targetGrid: string;
  terrainType: FwcTerrainType;
  postMovementAction?: FwcPostMovementAction;
  allocationId?: string;
}): Promise<ActionResult<{ movementId: string; canonicalConferenceId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };
  if (auth.role !== "delegate" && !isStaff(auth.role)) {
    return { ok: false, error: "Only FWC delegates and chairs can queue movement." };
  }

  const scope = await resolveFwcScope(auth.supabase, input.conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
  });
  if (!access.ok) return access;

  const targetGrid = input.targetGrid.trim();
  if (!targetGrid) return { ok: false, error: "A target grid is required." };
  if (!isFwcTerrainType(input.terrainType)) return { ok: false, error: "Invalid terrain type." };
  if (input.terrainType === "impassable") {
    return { ok: false, error: "Impassable terrain cannot be entered." };
  }

  const postMovementAction = input.postMovementAction ?? "none";
  if (!isFwcPostMovementAction(postMovementAction)) {
    return { ok: false, error: "Invalid post-movement action." };
  }

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  const ensured = await ensureFwcCrisisStateForScope(
    write.data,
    scope.data.canonicalConferenceId,
    scope.data.siblingConferenceIds
  );
  if (!ensured.ok) return ensured;

  const { data: existingStates } = await write.data
    .from("fwc_character_states")
    .select("allocation_id")
    .eq("conference_id", scope.data.canonicalConferenceId);
  const existingStateIds = new Set((existingStates ?? []).map((row) => row.allocation_id as string));

  let seat = pickCharacterSeat(access.data.seats, scope.data.canonicalConferenceId, existingStateIds);
  if (!seat && input.allocationId && isStaff(auth.role) && isUuid(input.allocationId)) {
    const chamberAllocs = await loadChamberAllocations(
      write.data,
      scope.data.siblingConferenceIds,
      scope.data.canonicalConferenceId
    );
    if (!chamberAllocs.ok) return chamberAllocs;
    seat = chamberAllocs.data.find((row) => row.id === input.allocationId && isCharacterSeat(row.country)) ?? null;
  }
  if (!seat) return { ok: false, error: "No FWC character seat found for movement." };

  const catalog = lookupFwcCharacter(seat.country ?? "");
  const state = await loadCharacterState(write.data, scope.data.canonicalConferenceId, seat.id);
  if (!state.ok) return state;

  const { data: queued } = await write.data
    .from("fwc_movements")
    .select("id")
    .eq("conference_id", scope.data.canonicalConferenceId)
    .eq("delegate_allocation_id", seat.id)
    .eq("status", "queued")
    .maybeSingle();
  if (queued?.id) return { ok: false, error: "You already have a movement queued." };

  const { data: created, error } = await write.data
    .from("fwc_movements")
    .insert({
      conference_id: scope.data.canonicalConferenceId,
      delegate_allocation_id: seat.id,
      current_grid: state.data.current_grid,
      target_grid: targetGrid,
      base_mp: state.data.base_mp ?? catalog?.baseMp ?? 0,
      bonus_mp: state.data.bonus_mp ?? catalog?.bonusMp ?? 0,
      terrain_type: input.terrainType,
      post_movement_action: postMovementAction,
      status: "queued" satisfies FwcMovementStatus,
    })
    .select("id")
    .single();
  if (error || !created?.id) return { ok: false, error: error?.message ?? "Could not queue movement." };

  revalidateFwcPaths();
  return {
    ok: true,
    data: { movementId: created.id, canonicalConferenceId: scope.data.canonicalConferenceId },
  };
}

export async function resolveFwcMovement(input: {
  conferenceId: string;
  movementId: string;
  decision: "approved" | "rejected";
}): Promise<ActionResult<{ movementId: string; status: FwcMovementStatus }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };

  const scope = await resolveFwcScope(auth.supabase, input.conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
    requireStaff: true,
  });
  if (!access.ok) return access;

  if (!isUuid(input.movementId)) return { ok: false, error: "Invalid movement id." };
  if (input.decision !== "approved" && input.decision !== "rejected") {
    return { ok: false, error: "Decision must be approved or rejected." };
  }

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  const { data: movement, error: readErr } = await write.data
    .from("fwc_movements")
    .select("id, delegate_allocation_id, target_grid, status")
    .eq("id", input.movementId)
    .eq("conference_id", scope.data.canonicalConferenceId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!movement) return { ok: false, error: "Movement not found." };
  if (movement.status !== "queued") {
    return { ok: false, error: "This movement is no longer queued." };
  }

  if (input.decision === "approved") {
    const { error: gridErr } = await write.data
      .from("fwc_character_states")
      .update({
        current_grid: movement.target_grid,
        updated_at: new Date().toISOString(),
      })
      .eq("conference_id", scope.data.canonicalConferenceId)
      .eq("allocation_id", movement.delegate_allocation_id);
    if (gridErr) return { ok: false, error: gridErr.message };
  }

  const { data: updated, error: statusErr } = await write.data
    .from("fwc_movements")
    .update({ status: input.decision })
    .eq("id", input.movementId)
    .eq("conference_id", scope.data.canonicalConferenceId)
    .select("id, status")
    .maybeSingle();
  if (statusErr) return { ok: false, error: statusErr.message };
  if (!updated?.id) return { ok: false, error: "Could not update movement." };

  revalidateFwcPaths();
  return { ok: true, data: { movementId: updated.id, status: updated.status as FwcMovementStatus } };
}

export async function updateFwcMeters(input: {
  conferenceId: string;
  meters: Partial<FwcMeters>;
}): Promise<ActionResult<{ meters: FwcMeters }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };

  const scope = await resolveFwcScope(auth.supabase, input.conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
    requireStaff: true,
  });
  if (!access.ok) return access;

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  const ensured = await ensureFwcCrisisStateForScope(
    write.data,
    scope.data.canonicalConferenceId,
    scope.data.siblingConferenceIds
  );
  if (!ensured.ok) return ensured;

  const patch = pickMetersPatch(input.meters);
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No meter values to update." };
  }

  const { data: updated, error } = await write.data
    .from("fwc_meters")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("conference_id", scope.data.canonicalConferenceId)
    .select(FWC_METERS_SELECT)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "FWC meters are not initialized." };

  revalidateFwcPaths();
  return { ok: true, data: { meters: metersFromRow(updated) } };
}

const EVIDENCE_SELECT =
  "id, slug, category, title, starting_location, discoverable_by, tactical_effect, is_secret, found, current_location, held_by_allocation_id, found_by_allocation_id, found_at, notes";

const EVIDENCE_STORAGE_PREFIX = "fwc-evidence";

function mapEvidenceRow(row: Record<string, unknown>): FwcEvidenceMonitorRow {
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    category: String(row.category ?? ""),
    title: String(row.title ?? ""),
    startingLocation: String(row.starting_location ?? ""),
    discoverableBy: String(row.discoverable_by ?? ""),
    tacticalEffect: String(row.tactical_effect ?? ""),
    isSecret: Boolean(row.is_secret),
    found: Boolean(row.found),
    currentLocation: String(row.current_location ?? row.starting_location ?? ""),
    heldByAllocationId: typeof row.held_by_allocation_id === "string" ? row.held_by_allocation_id : null,
    foundByAllocationId: typeof row.found_by_allocation_id === "string" ? row.found_by_allocation_id : null,
    foundAt: typeof row.found_at === "string" ? row.found_at : null,
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

function evidenceStoragePath(canonicalConferenceId: string): string {
  return `${EVIDENCE_STORAGE_PREFIX}/${canonicalConferenceId}/library.xlsx`;
}

async function upsertEvidenceCatalog(
  db: SupabaseClient,
  canonicalConferenceId: string,
  catalog: readonly FwcEvidenceCatalogItem[]
): Promise<ActionResult<{ upserted: number }>> {
  if (catalog.length === 0) return { ok: false, error: "No evidence rows to import." };

  const rows = catalog.map((item) => ({
    conference_id: canonicalConferenceId,
    slug: item.slug,
    category: item.category,
    title: item.title,
    starting_location: item.startingLocation,
    discoverable_by: item.discoverableBy,
    tactical_effect: item.tacticalEffect,
    is_secret: item.isSecret,
    extras: {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("fwc_evidence_items").upsert(rows, {
    onConflict: "conference_id,slug",
    ignoreDuplicates: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { upserted: rows.length } };
}

async function loadEvidenceHolders(
  db: SupabaseClient,
  siblingConferenceIds: string[],
  canonicalConferenceId: string
): Promise<ActionResult<FwcEvidenceHolder[]>> {
  const allocs = await loadChamberAllocations(db, siblingConferenceIds, canonicalConferenceId);
  if (!allocs.ok) return allocs;
  const holders = allocs.data
    .filter((row) => isCharacterSeat(row.country) && row.country)
    .map((row) => ({ id: row.id, country: String(row.country) }))
    .sort((a, b) => a.country.localeCompare(b.country));
  return { ok: true, data: holders };
}

async function loadEvidenceSource(
  db: SupabaseClient,
  canonicalConferenceId: string
): Promise<FwcEvidenceSourceMeta | null> {
  const { data } = await db
    .from("fwc_evidence_sources")
    .select("filename, public_url, uploaded_at")
    .eq("conference_id", canonicalConferenceId)
    .maybeSingle();
  if (!data) return null;
  return {
    filename: String(data.filename ?? FWC_EVIDENCE_SOURCE_FILENAME),
    publicUrl: typeof data.public_url === "string" ? data.public_url : null,
    uploadedAt: typeof data.uploaded_at === "string" ? data.uploaded_at : null,
  };
}

async function storeEvidenceXlsx(input: {
  db: SupabaseClient;
  canonicalConferenceId: string;
  buffer: Buffer;
  filename: string;
  uploadedBy: string;
}): Promise<ActionResult<FwcEvidenceSourceMeta>> {
  const objectPath = evidenceStoragePath(input.canonicalConferenceId);
  const { error: uploadErr } = await input.db.storage.from(GUIDE_FILES_BUCKET).upload(objectPath, input.buffer, {
    upsert: true,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: publicUrlData } = input.db.storage.from(GUIDE_FILES_BUCKET).getPublicUrl(objectPath);
  const publicUrl = publicUrlData.publicUrl || null;
  const uploadedAt = new Date().toISOString();

  const { error: metaErr } = await input.db.from("fwc_evidence_sources").upsert(
    {
      conference_id: input.canonicalConferenceId,
      storage_bucket: GUIDE_FILES_BUCKET,
      storage_path: objectPath,
      filename: input.filename,
      public_url: publicUrl,
      uploaded_at: uploadedAt,
      uploaded_by: input.uploadedBy,
    },
    { onConflict: "conference_id" }
  );
  if (metaErr) return { ok: false, error: metaErr.message };

  return {
    ok: true,
    data: { filename: input.filename, publicUrl, uploadedAt },
  };
}

async function ensureBundledEvidenceSource(
  db: SupabaseClient,
  canonicalConferenceId: string,
  uploadedBy: string
): Promise<FwcEvidenceSourceMeta | null> {
  const existing = await loadEvidenceSource(db, canonicalConferenceId);
  if (existing) return existing;
  try {
    const filePath = nodePath.join(process.cwd(), FWC_EVIDENCE_BUNDLED_XLSX_RELATIVE_PATH);
    const buffer = await readFile(filePath);
    const stored = await storeEvidenceXlsx({
      db,
      canonicalConferenceId,
      buffer,
      filename: FWC_EVIDENCE_SOURCE_FILENAME,
      uploadedBy,
    });
    return stored.ok ? stored.data : null;
  } catch {
    return null;
  }
}

async function loadEvidenceItems(
  db: SupabaseClient,
  canonicalConferenceId: string
): Promise<ActionResult<FwcEvidenceMonitorRow[]>> {
  const { data, error } = await db
    .from("fwc_evidence_items")
    .select(EVIDENCE_SELECT)
    .eq("conference_id", canonicalConferenceId)
    .order("slug", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []).map((row) => mapEvidenceRow(row as Record<string, unknown>)) };
}

async function requireFwcEvidenceStaff(conferenceId: string): Promise<
  ActionResult<{
    db: SupabaseClient;
    userId: string;
    canonicalConferenceId: string;
    siblingConferenceIds: string[];
  }>
> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Sign in required." };

  const scope = await resolveFwcScope(auth.supabase, conferenceId);
  if (!scope.ok) return scope;

  const access = await userMayAccessFwc({
    supabase: auth.supabase,
    userId: auth.user.id,
    role: auth.role,
    canonicalConferenceId: scope.data.canonicalConferenceId,
    siblingConferenceIds: scope.data.siblingConferenceIds,
    requireStaff: true,
  });
  if (!access.ok) return access;

  const write = requireWriteDb(auth.role, auth.supabase);
  if (!write.ok) return write;

  return {
    ok: true,
    data: {
      db: write.data,
      userId: auth.user.id,
      canonicalConferenceId: scope.data.canonicalConferenceId,
      siblingConferenceIds: scope.data.siblingConferenceIds,
    },
  };
}

/** Upsert the spreadsheet catalog for this FWC chamber without wiping found/location. */
export async function ensureFwcEvidenceLibrary(
  conferenceId: string
): Promise<ActionResult<FwcEvidenceLibraryPayload>> {
  const ctx = await requireFwcEvidenceStaff(conferenceId);
  if (!ctx.ok) return ctx;

  const upserted = await upsertEvidenceCatalog(
    ctx.data.db,
    ctx.data.canonicalConferenceId,
    FWC_EVIDENCE_LIBRARY
  );
  if (!upserted.ok) return upserted;

  const source = await ensureBundledEvidenceSource(
    ctx.data.db,
    ctx.data.canonicalConferenceId,
    ctx.data.userId
  );
  const items = await loadEvidenceItems(ctx.data.db, ctx.data.canonicalConferenceId);
  if (!items.ok) return items;
  const holders = await loadEvidenceHolders(
    ctx.data.db,
    ctx.data.siblingConferenceIds,
    ctx.data.canonicalConferenceId
  );
  if (!holders.ok) return holders;

  return {
    ok: true,
    data: {
      canonicalConferenceId: ctx.data.canonicalConferenceId,
      items: items.data,
      holders: holders.data,
      source,
    },
  };
}

export async function updateFwcEvidenceState(input: {
  conferenceId: string;
  itemId: string;
  found?: boolean;
  currentLocation?: string | null;
  heldByAllocationId?: string | null;
  notes?: string | null;
}): Promise<ActionResult<{ item: FwcEvidenceMonitorRow }>> {
  const ctx = await requireFwcEvidenceStaff(input.conferenceId);
  if (!ctx.ok) return ctx;
  if (!isUuid(input.itemId)) return { ok: false, error: "Invalid evidence id." };

  const { data: current, error: readErr } = await ctx.data.db
    .from("fwc_evidence_items")
    .select(EVIDENCE_SELECT)
    .eq("id", input.itemId)
    .eq("conference_id", ctx.data.canonicalConferenceId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: "Evidence item not found." };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof input.found === "boolean") {
    patch.found = input.found;
    if (input.found) {
      patch.found_at = current.found_at ?? new Date().toISOString();
    } else {
      patch.found_at = null;
      patch.found_by_allocation_id = null;
    }
  }
  if (input.currentLocation !== undefined) {
    const loc = input.currentLocation?.trim() ?? "";
    patch.current_location = loc || null;
  }
  if (input.heldByAllocationId !== undefined) {
    const holder = input.heldByAllocationId?.trim() || null;
    if (holder && !isUuid(holder)) return { ok: false, error: "Invalid character seat." };
    patch.held_by_allocation_id = holder;
  }
  if (input.notes !== undefined) {
    patch.notes = input.notes?.trim() || null;
  }

  const { data: updated, error } = await ctx.data.db
    .from("fwc_evidence_items")
    .update(patch)
    .eq("id", input.itemId)
    .eq("conference_id", ctx.data.canonicalConferenceId)
    .select(EVIDENCE_SELECT)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "Could not update evidence." };

  revalidatePath("/chair/fwc/evidence");
  return { ok: true, data: { item: mapEvidenceRow(updated as Record<string, unknown>) } };
}

export async function uploadFwcEvidenceLibrary(formData: FormData): Promise<
  ActionResult<FwcEvidenceLibraryPayload>
> {
  const conferenceId = String(formData.get("conferenceId") ?? "").trim();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose an .xlsx file." };
  if (!isXlsxUpload(file)) {
    return { ok: false, error: "Upload a valid .xlsx evidence library." };
  }

  const ctx = await requireFwcEvidenceStaff(conferenceId);
  if (!ctx.ok) return ctx;

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = parseFwcEvidenceXlsx(buffer);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not read that spreadsheet." };
  }
  if (parsed.items.length === 0) {
    return { ok: false, error: "That spreadsheet has no evidence rows." };
  }

  const upserted = await upsertEvidenceCatalog(ctx.data.db, ctx.data.canonicalConferenceId, parsed.items);
  if (!upserted.ok) return upserted;

  const stored = await storeEvidenceXlsx({
    db: ctx.data.db,
    canonicalConferenceId: ctx.data.canonicalConferenceId,
    buffer,
    filename: file.name.trim() || FWC_EVIDENCE_SOURCE_FILENAME,
    uploadedBy: ctx.data.userId,
  });
  if (!stored.ok) return stored;

  const items = await loadEvidenceItems(ctx.data.db, ctx.data.canonicalConferenceId);
  if (!items.ok) return items;
  const holders = await loadEvidenceHolders(
    ctx.data.db,
    ctx.data.siblingConferenceIds,
    ctx.data.canonicalConferenceId
  );
  if (!holders.ok) return holders;

  revalidatePath("/chair/fwc/evidence");
  return {
    ok: true,
    data: {
      canonicalConferenceId: ctx.data.canonicalConferenceId,
      items: items.data,
      holders: holders.data,
      source: stored.data,
    },
  };
}

