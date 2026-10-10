// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

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
import { getSmtActingSeat, smtCanActForConference } from "@/lib/smt-acting-seat";

export type FwcResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type FwcProfileRole = "delegate" | "chair" | "smt" | "admin";

/** How an action is attributed in audit rows (`actor_role` / `created_by_role`). */
export type FwcActorRole = "delegate" | "smt_acting" | "chair" | "staff";

export type FwcSeat = {
  id: string;
  country: string | null;
  user_id: string | null;
  conference_id: string;
};

export type FwcActor = {
  userId: string;
  profileRole: FwcProfileRole;
  actorRole: FwcActorRole;
  /** Chair / SMT / admin acting as dais (not acting for a seat). */
  isStaff: boolean;
  /** Character seat this action is taken as (own seat, or the seat SMT is acting for). */
  seat: FwcSeat | null;
  /** Set only when SMT/admin is acting for a delegate seat. */
  actingAllocationId: string | null;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  /** Signed-in client (RLS). */
  supabase: SupabaseClient;
  /** Write client: service role when configured, otherwise the staff user's client. */
  db: SupabaseClient;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: string | null | undefined): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isFwcCharacterSeat(country: string | null | undefined): boolean {
  if (isDaisSeatAllocationCountry(country) || isCommitteeChairSeatLabel(country)) return false;
  return lookupFwcCharacter(country ?? "") != null;
}

export async function resolveFwcConferenceScope(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<FwcResult<{ canonicalConferenceId: string; siblingConferenceIds: string[] }>> {
  if (!isUuid(conferenceId)) return { ok: false, error: "Invalid conference id." };
  const [chamber, bundle] = await Promise.all([
    getChamberScope(supabase, conferenceId),
    getResolvedDebateConferenceBundle(supabase, conferenceId),
  ]);
  const fwcErr = requireFwcCommittee(bundle.committeeLabelRaw);
  if (fwcErr) return { ok: false, error: fwcErr };
  return {
    ok: true,
    data: {
      canonicalConferenceId: bundle.canonicalConferenceId || chamber.canonicalConferenceId,
      siblingConferenceIds:
        bundle.siblingConferenceIds.length > 0 ? bundle.siblingConferenceIds : chamber.siblingConferenceIds,
    },
  };
}

export async function loadFwcChamberSeats(
  db: SupabaseClient,
  siblingConferenceIds: string[],
  canonicalConferenceId: string
): Promise<FwcSeat[]> {
  const { data } = await db
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", siblingConferenceIds);
  return mergeAllocationsAcrossSiblingConferences((data ?? []) as FwcSeat[], canonicalConferenceId);
}

/**
 * Whether an SMT/admin user may act for this FWC character seat. Defers to the
 * shared SMT rule (`smtCanActForConference`, mirror of `private.smt_can_act_for_conference`).
 */
export async function fwcStaffMayActForSeat(input: {
  supabase: SupabaseClient;
  userId: string;
  profileRole: FwcProfileRole;
  seat: FwcSeat | null;
}): Promise<boolean> {
  if (input.profileRole !== "smt" && input.profileRole !== "admin") return false;
  if (!input.seat || !isFwcCharacterSeat(input.seat.country)) return false;
  return smtCanActForConference(input.supabase, input.userId, input.seat.conference_id);
}

async function chairLinkedToChamber(
  supabase: SupabaseClient,
  userId: string,
  canonicalConferenceId: string,
  seated: boolean
): Promise<boolean> {
  if (seated) return true;
  const activeConf = await resolveDashboardConferenceForUser("chair", userId);
  if (!activeConf) return false;
  const activeScope = await getCommitteeAwardScope(supabase, activeConf.id);
  return activeScope.canonicalConferenceId === canonicalConferenceId;
}

/**
 * Resolve who is acting in an FWC action and check they may.
 *
 * - Delegates act as their own character seat.
 * - SMT/admin on the delegate surface act for `smt_delegate_allocation_id`
 *   (or an explicit `actingAllocationId`) and are attributed as `smt_acting`.
 * - Chairs / SMT / admin otherwise act as dais staff.
 */
export async function resolveFwcActor(
  conferenceId: string,
  opts?: { actingAllocationId?: string | null; requireStaff?: boolean; requireSeat?: boolean }
): Promise<FwcResult<FwcActor>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profileRole = String(profile?.role ?? "").toLowerCase() as FwcProfileRole;
  if (!["delegate", "chair", "smt", "admin"].includes(profileRole)) {
    return { ok: false, error: "Your account cannot use the FWC crisis tools." };
  }

  const scope = await resolveFwcConferenceScope(supabase, conferenceId);
  if (!scope.ok) return scope;
  const { canonicalConferenceId, siblingConferenceIds } = scope.data;

  const admin = createAdminClient();
  const staffRole = profileRole === "chair" || profileRole === "smt" || profileRole === "admin";
  if (!admin && !staffRole) return { ok: false, error: "Server is not configured to write FWC crisis state." };
  const db = admin ?? supabase;

  const chamberSeats = await loadFwcChamberSeats(db, siblingConferenceIds, canonicalConferenceId);
  const ownSeats = chamberSeats.filter((s) => s.user_id === user.id);
  const ownCharacter = ownSeats.find((s) => isFwcCharacterSeat(s.country)) ?? null;

  let actingAllocationId: string | null = null;
  if (profileRole === "smt" || profileRole === "admin") {
    const explicit = isUuid(opts?.actingAllocationId) ? opts!.actingAllocationId! : null;
    const fromSurface = explicit ? null : ((await getSmtActingSeat())?.allocationId ?? null);
    const candidate = explicit ?? fromSurface;
    if (candidate) {
      const seat = chamberSeats.find((s) => s.id === candidate) ?? null;
      if (await fwcStaffMayActForSeat({ supabase, userId: user.id, profileRole, seat })) actingAllocationId = candidate;
      else if (explicit) return { ok: false, error: "You cannot act for that seat." };
    }
  }

  if (profileRole === "delegate" && ownSeats.length === 0) {
    return { ok: false, error: "You are not seated in this FWC committee." };
  }
  if (profileRole === "chair") {
    const linked = await chairLinkedToChamber(supabase, user.id, canonicalConferenceId, ownSeats.length > 0);
    if (!linked) return { ok: false, error: "Your chair account is not linked to this FWC committee." };
  }

  const seat = actingAllocationId
    ? (chamberSeats.find((s) => s.id === actingAllocationId) ?? null)
    : ownCharacter;
  const actorRole: FwcActorRole = actingAllocationId
    ? "smt_acting"
    : profileRole === "delegate"
      ? "delegate"
      : profileRole === "chair"
        ? "chair"
        : "staff";
  const isStaff = staffRole && !actingAllocationId;

  if (opts?.requireStaff && !isStaff) return { ok: false, error: "Only chairs and secretariat can do this." };
  if (opts?.requireSeat && !seat) return { ok: false, error: "You need an FWC character seat for this." };

  return {
    ok: true,
    data: {
      userId: user.id,
      profileRole,
      actorRole,
      isStaff,
      seat,
      actingAllocationId,
      canonicalConferenceId,
      siblingConferenceIds,
      supabase,
      db,
    },
  };
}
