// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";

export type SeatRosterInfo = {
  allocationId: string;
  conferenceId: string;
  country: string | null;
  committee: string | null;
  eventId: string | null;
  ownerUserId: string | null;
  name: string | null;
  school: string | null;
  pronouns: string | null;
  grade: string | null;
  /** Roster contact email — only populated for SMT / admin viewers (RLS on allocation_roster_contacts). */
  email: string | null;
  rosterStatus: string | null;
  signedUp: boolean;
};

type AllocationRow = {
  id: string;
  conference_id: string;
  country: string | null;
  user_id: string | null;
  display_name_override: string | null;
  display_school_override: string | null;
  display_pronouns_override: string | null;
};

type RosterRow = {
  allocation_id: string | null;
  full_name: string | null;
  email: string | null;
  school: string | null;
  grade: string | null;
  status: string | null;
};

function clean(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/**
 * Seat details for allocations whether or not anyone has claimed them yet: account profile first,
 * then matrix display overrides, then the staff-only roster contact row.
 */
export async function loadSeatRosterInfo(
  supabase: SupabaseClient,
  allocationIds: string[]
): Promise<Map<string, SeatRosterInfo>> {
  const ids = [...new Set(allocationIds.filter(Boolean))];
  const chunkSize = 150;
  if (ids.length > chunkSize) {
    const out = new Map<string, SeatRosterInfo>();
    for (let i = 0; i < ids.length; i += chunkSize) {
      const part = await loadSeatRosterInfo(supabase, ids.slice(i, i + chunkSize));
      for (const [k, v] of part) out.set(k, v);
    }
    return out;
  }
  const out = new Map<string, SeatRosterInfo>();
  if (ids.length === 0) return out;

  const { data: allocs } = await supabase
    .from("allocations")
    .select(
      "id, conference_id, country, user_id, display_name_override, display_school_override, display_pronouns_override"
    )
    .in("id", ids);
  const rows = (allocs ?? []) as AllocationRow[];
  if (rows.length === 0) return out;

  const conferenceIds = [...new Set(rows.map((r) => r.conference_id))];
  const ownerIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];

  const [{ data: confs }, { data: owners }, { data: roster }] = await Promise.all([
    supabase.from("conferences").select("id, committee, event_id").in("id", conferenceIds),
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, name, school, pronouns, grade").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; school: string | null; pronouns: string | null; grade: string | null }[] }),
    supabase
      .from("allocation_roster_contacts")
      .select("allocation_id, full_name, email, school, grade, status")
      .in("allocation_id", ids),
  ]);

  const confById = new Map((confs ?? []).map((c) => [c.id as string, c]));
  const ownerById = new Map((owners ?? []).map((p) => [p.id as string, p]));
  const rosterByAlloc = new Map<string, RosterRow>();
  for (const r of (roster ?? []) as RosterRow[]) {
    if (r.allocation_id && !rosterByAlloc.has(r.allocation_id)) rosterByAlloc.set(r.allocation_id, r);
  }

  for (const row of rows) {
    const conf = confById.get(row.conference_id);
    const owner = row.user_id ? ownerById.get(row.user_id) : undefined;
    const contact = rosterByAlloc.get(row.id);
    out.set(row.id, {
      allocationId: row.id,
      conferenceId: row.conference_id,
      country: clean(row.country),
      committee: clean(conf?.committee as string | null | undefined),
      eventId: (conf?.event_id as string | null | undefined) ?? null,
      ownerUserId: row.user_id,
      name: clean(owner?.name) ?? clean(row.display_name_override) ?? clean(contact?.full_name),
      school: clean(owner?.school) ?? clean(row.display_school_override) ?? clean(contact?.school),
      pronouns: clean(owner?.pronouns) ?? clean(row.display_pronouns_override),
      grade: clean(owner?.grade) ?? clean(contact?.grade),
      email: clean(contact?.email),
      rosterStatus: clean(contact?.status),
      signedUp: Boolean(row.user_id),
    });
  }
  return out;
}

/**
 * App-side mirror of `private.smt_can_act_for_conference`: admins anywhere, SMT only inside an event
 * where they hold a seat. Use where writes go through the service-role client.
 */
export async function smtCanActForConference(
  supabase: SupabaseClient,
  userId: string,
  conferenceId: string
): Promise<boolean> {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role === "admin") return true;
  if (role !== "smt") return false;

  const { data: target } = await supabase
    .from("conferences")
    .select("event_id")
    .eq("id", conferenceId)
    .maybeSingle();
  if (!target?.event_id) return false;

  const { data: ownSeats } = await supabase
    .from("allocations")
    .select("conference_id")
    .eq("user_id", userId);
  const ownConferenceIds = [...new Set((ownSeats ?? []).map((r) => r.conference_id as string))];
  if (ownConferenceIds.length === 0) return false;
  const { data: sameEvent } = await supabase
    .from("conferences")
    .select("id")
    .in("id", ownConferenceIds)
    .eq("event_id", target.event_id)
    .limit(1);
  return (sameEvent?.length ?? 0) > 0;
}

export type SmtActingSeat = SeatRosterInfo;

/**
 * The delegation an SMT user is acting for while on the delegate surface ("view as" a seat).
 * Returns null for everyone else, so delegate pages keep resolving the signed-in user's own seat.
 */
export const getSmtActingSeat = cache(async (): Promise<SmtActingSeat | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, smt_delegate_allocation_id")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "smt" && role !== "admin") return null;
  if ((await getSmtDashboardSurface()) !== "delegate") return null;

  const allocationId = (profile as { smt_delegate_allocation_id?: string | null } | null)
    ?.smt_delegate_allocation_id?.trim();
  if (!allocationId) return null;

  const info = await loadSeatRosterInfo(supabase, [allocationId]);
  return info.get(allocationId) ?? null;
});
