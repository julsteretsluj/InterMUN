// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFwcCrisisState } from "@/app/actions/fwcCrisis";
import { getCommitteeAwardScope, mergeAllocationsAcrossSiblingConferences } from "@/lib/conference-committee-canonical";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import {
  FWC_METER_KEYS,
  type FwcMeters,
  type FwcPostMovementAction,
  type FwcTerrainType,
} from "@/lib/fwc/types";
import { isCommitteeChairSeatLabel, isDaisSeatAllocationCountry } from "@/lib/dais-seat-plan";

const DEFAULT_METERS: FwcMeters = {
  public_panic_exposure: 0,
  dimensional_breach_index: 1,
  hive_strain_spore_density: 0,
  covert_secrecy_index: 0,
  subterranean_footprint: 0,
  subject_control_rating: 0,
};

type AllocRow = {
  id: string;
  country: string | null;
  user_id: string | null;
  conference_id: string;
};

function isCharacterSeat(country: string | null | undefined): boolean {
  if (isDaisSeatAllocationCountry(country) || isCommitteeChairSeatLabel(country)) return false;
  return lookupFwcCharacter(country ?? "") != null;
}

export type FwcLoadedSeat = {
  id: string;
  country: string;
  displayName: string;
  portfolio: string;
  anonymityEligible: boolean;
};

export type FwcLoadedCharacterState = {
  allocationId: string;
  currentGrid: string;
  baseMp: number;
  bonusMp: number;
  anonymityUsedSession: boolean;
};

export type FwcLoadedMovement = {
  id: string;
  delegateAllocationId: string;
  delegateName: string;
  currentGrid: string;
  targetGrid: string;
  baseMp: number;
  bonusMp: number;
  terrainType: FwcTerrainType;
  postMovementAction: FwcPostMovementAction;
  status: string;
  createdAt: string;
};

export async function loadFwcChamberSnapshot(
  supabase: SupabaseClient,
  conferenceId: string,
  opts?: { movementStatuses?: string[] }
): Promise<{
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  meters: FwcMeters;
  seats: FwcLoadedSeat[];
  seatsById: Record<string, FwcLoadedSeat>;
  nameByAllocationId: Record<string, string>;
  characterStatesByAllocationId: Record<string, FwcLoadedCharacterState>;
  movements: FwcLoadedMovement[];
  ensureError: string | null;
}> {
  const ensured = await ensureFwcCrisisState(conferenceId);
  const ensureError = ensured.ok ? null : ensured.error;

  const scope = await getCommitteeAwardScope(supabase, conferenceId);
  const canonicalConferenceId = ensured.ok
    ? ensured.data.canonicalConferenceId
    : scope.canonicalConferenceId;
  const siblingConferenceIds =
    scope.siblingConferenceIds.length > 0 ? scope.siblingConferenceIds : [conferenceId];

  const { data: allocRows } = await supabase
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", siblingConferenceIds);

  const merged = mergeAllocationsAcrossSiblingConferences(
    (allocRows ?? []) as AllocRow[],
    canonicalConferenceId
  );

  const seats: FwcLoadedSeat[] = [];
  for (const row of merged) {
    if (!isCharacterSeat(row.country)) continue;
    const catalog = lookupFwcCharacter(row.country ?? "");
    if (!catalog) continue;
    seats.push({
      id: row.id,
      country: String(row.country),
      displayName: catalog.displayName,
      portfolio: catalog.powersAndAssets,
      anonymityEligible: catalog.anonymityEligible,
    });
  }
  seats.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const seatsById: Record<string, FwcLoadedSeat> = {};
  const nameByAllocationId: Record<string, string> = {};
  for (const seat of seats) {
    seatsById[seat.id] = seat;
    nameByAllocationId[seat.id] = seat.displayName;
  }

  const { data: metersRow } = await supabase
    .from("fwc_meters")
    .select(
      "public_panic_exposure, dimensional_breach_index, hive_strain_spore_density, covert_secrecy_index, subterranean_footprint, subject_control_rating"
    )
    .eq("conference_id", canonicalConferenceId)
    .maybeSingle();

  const meters: FwcMeters = { ...DEFAULT_METERS };
  if (metersRow && typeof metersRow === "object" && !("error" in metersRow)) {
    for (const key of FWC_METER_KEYS) {
      const value = Number((metersRow as Record<string, unknown>)[key]);
      if (Number.isFinite(value)) meters[key] = value;
    }
  }

  const { data: stateRows } = await supabase
    .from("fwc_character_states")
    .select("allocation_id, current_grid, base_mp, bonus_mp, anonymity_used_session")
    .eq("conference_id", canonicalConferenceId);

  const characterStatesByAllocationId: Record<string, FwcLoadedCharacterState> = {};
  for (const row of stateRows ?? []) {
    const allocationId = String(row.allocation_id);
    characterStatesByAllocationId[allocationId] = {
      allocationId,
      currentGrid: String(row.current_grid ?? ""),
      baseMp: Number(row.base_mp ?? 0),
      bonusMp: Number(row.bonus_mp ?? 0),
      anonymityUsedSession: Boolean(row.anonymity_used_session),
    };
  }

  const statuses = opts?.movementStatuses ?? ["queued"];
  const { data: movementRows } = await supabase
    .from("fwc_movements")
    .select(
      "id, delegate_allocation_id, current_grid, target_grid, base_mp, bonus_mp, terrain_type, post_movement_action, status, created_at"
    )
    .eq("conference_id", canonicalConferenceId)
    .in("status", statuses)
    .order("created_at", { ascending: true });

  const movements: FwcLoadedMovement[] = (movementRows ?? []).map((row) => {
    const delegateAllocationId = String(row.delegate_allocation_id);
    return {
      id: String(row.id),
      delegateAllocationId,
      delegateName: nameByAllocationId[delegateAllocationId] ?? "Unknown",
      currentGrid: String(row.current_grid ?? ""),
      targetGrid: String(row.target_grid ?? ""),
      baseMp: Number(row.base_mp ?? 0),
      bonusMp: Number(row.bonus_mp ?? 0),
      terrainType: row.terrain_type as FwcTerrainType,
      postMovementAction: row.post_movement_action as FwcPostMovementAction,
      status: String(row.status ?? "queued"),
      createdAt: String(row.created_at ?? ""),
    };
  });

  return {
    canonicalConferenceId,
    siblingConferenceIds,
    meters,
    seats,
    seatsById,
    nameByAllocationId,
    characterStatesByAllocationId,
    movements,
    ensureError,
  };
}

export async function loadViewerFwcCharacterSeat(
  supabase: SupabaseClient,
  userId: string,
  siblingConferenceIds: string[],
  canonicalConferenceId: string,
  characterStatesByAllocationId: Record<string, FwcLoadedCharacterState>
): Promise<{
  seat: FwcLoadedSeat | null;
  state: FwcLoadedCharacterState | null;
  viewerAllocationIds: string[];
}> {
  const { data: seats } = await supabase
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", siblingConferenceIds)
    .eq("user_id", userId);

  const viewerAllocationIds = (seats ?? []).map((row) => String(row.id));
  const characterSeats = (seats ?? []).filter((row) => isCharacterSeat(row.country));
  if (characterSeats.length === 0) {
    return { seat: null, state: null, viewerAllocationIds };
  }

  const withState =
    characterSeats.find((row) => characterStatesByAllocationId[row.id]) ??
    characterSeats.find((row) => row.conference_id === canonicalConferenceId) ??
    characterSeats[0];

  const catalog = lookupFwcCharacter(withState.country ?? "");
  if (!catalog) return { seat: null, state: null, viewerAllocationIds };

  const seat: FwcLoadedSeat = {
    id: withState.id,
    country: String(withState.country),
    displayName: catalog.displayName,
    portfolio: catalog.powersAndAssets,
    anonymityEligible: catalog.anonymityEligible,
  };
  const state = characterStatesByAllocationId[seat.id] ?? {
    allocationId: seat.id,
    currentGrid: catalog.baseGrid,
    baseMp: catalog.baseMp,
    bonusMp: catalog.bonusMp,
    anonymityUsedSession: false,
  };

  return { seat, state, viewerAllocationIds };
}
