// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isAdvisorRole, isAdminRole, isSmtRole } from "@/lib/roles";
import { DAIS_SEAT_CO_CHAIR, DAIS_SEAT_HEAD_CHAIR } from "@/lib/allocation-display-order";
import { isConferenceEventPlaceholderRow } from "@/lib/awards";
import {
  canonicalCommitteesForEventConferenceRows,
  getCommitteeAwardScope,
  mergeAllocationsAcrossSiblingConferences,
} from "@/lib/conference-committee-canonical";
import { isRetiredSeamunCommitteeRow } from "@/lib/retired-seamun-committees";
import { isSmtSecretariatConferenceRow } from "@/lib/smt-conference-filters";
import { compareCommitteeRowsByDifficultyThenLabel } from "@/lib/committee-difficulty-sort";
import {
  computeMilestonesForScope,
  type MilestoneCounts,
  type MilestoneProgress,
  totalEarnedCheckpoints,
} from "@/lib/committee-milestones";

export type DelegateMilestoneRow = {
  allocationId: string;
  label: string;
  milestones: MilestoneProgress[];
  earned: number;
};

export type MilestoneChamberKind = "committee" | "council";

export type CommitteeMilestoneGroup = {
  conferenceId: string;
  label: string;
  /** SMT / secretariat sheet is a council, not a delegate committee chamber. */
  kind: MilestoneChamberKind;
  committee: MilestoneProgress[];
  delegates: DelegateMilestoneRow[];
};

export type MilestonesData = {
  role: string;
  self: DelegateMilestoneRow | null;
  committees: CommitteeMilestoneGroup[];
};

type AllocRow = { id: string; country: string | null; user_id: string | null; conference_id: string };

type ConfRow = { id: string; name: string | null; committee: string | null };

function isDaisSeat(country: string | null): boolean {
  const key = (country ?? "").trim().toLowerCase();
  return (
    key === DAIS_SEAT_HEAD_CHAIR.toLowerCase() ||
    key === DAIS_SEAT_CO_CHAIR.toLowerCase() ||
    key === "co chair"
  );
}

function mergeMilestoneCounts(...counts: MilestoneCounts[]): MilestoneCounts {
  const out: MilestoneCounts = {};
  for (const c of counts) {
    for (const key of Object.keys(c) as (keyof MilestoneCounts)[]) {
      const v = c[key];
      if (v == null) continue;
      out[key] = (out[key] ?? 0) + v;
    }
  }
  return out;
}

function siblingConferenceIdsForCanonical(
  canonicalId: string,
  conferenceIdToCanonical: Map<string, string>
): string[] {
  const ids: string[] = [];
  for (const [confId, canonId] of conferenceIdToCanonical) {
    if (canonId === canonicalId) ids.push(confId);
  }
  return ids.length > 0 ? ids : [canonicalId];
}

/** Committee-scope counts aggregated across sibling topic rows. */
async function committeeCountsForConferences(
  supabase: SupabaseClient,
  conferenceIds: string[]
): Promise<MilestoneCounts> {
  if (conferenceIds.length === 0) return {};
  const [{ data }, { data: amendmentRows }] = await Promise.all([
    supabase
      .from("vote_items")
      .select("procedure_code, vote_type, outcome, closed_at")
      .in("conference_id", conferenceIds),
    supabase.from("amendments").select("id").in("conference_id", conferenceIds),
  ]);
  let mod = 0;
  let unmod = 0;
  let cons = 0;
  let resolutionsPassed = 0;
  for (const r of (data ?? []) as {
    procedure_code: string | null;
    vote_type: string | null;
    outcome: string | null;
    closed_at: string | null;
  }[]) {
    const held = r.closed_at != null;
    if (held && r.procedure_code === "moderated_caucus") mod += 1;
    else if (held && r.procedure_code === "unmoderated_caucus") unmod += 1;
    else if (held && r.procedure_code === "consultation") cons += 1;
    if (r.vote_type === "resolution" && r.outcome === "passed") resolutionsPassed += 1;
  }
  return {
    moderated_caucuses: mod,
    unmoderated_caucuses: unmod,
    consultations: cons,
    resolutions_passed: resolutionsPassed,
    amendments: (amendmentRows ?? []).length,
  };
}

/** Per-allocation delegate counts across sibling topic rows. */
async function rawDelegateCountsByAllocation(
  supabase: SupabaseClient,
  conferenceIds: string[]
): Promise<Map<string, MilestoneCounts>> {
  if (conferenceIds.length === 0) return new Map();

  const raw = new Map<string, { speeches: number; points: number; amendments: number }>();
  const bump = (id: string | null, key: "speeches" | "points" | "amendments") => {
    if (!id) return;
    const e = raw.get(id) ?? { speeches: 0, points: 0, amendments: 0 };
    e[key] += 1;
    raw.set(id, e);
  };

  const [{ data: speeches }, { data: points }, { data: amendments }] = await Promise.all([
    supabase.from("committee_speech_events").select("allocation_id").in("conference_id", conferenceIds),
    supabase
      .from("chair_session_points")
      .select("raised_by_allocation_id, point_code")
      .in("conference_id", conferenceIds)
      .in("point_code", ["poi", "poc"]),
    supabase
      .from("amendments")
      .select("submitter_allocation_id")
      .in("conference_id", conferenceIds),
  ]);

  for (const s of (speeches ?? []) as { allocation_id: string | null }[]) bump(s.allocation_id, "speeches");
  for (const p of (points ?? []) as { raised_by_allocation_id: string | null }[]) {
    bump(p.raised_by_allocation_id, "points");
  }
  for (const a of (amendments ?? []) as { submitter_allocation_id: string | null }[]) {
    bump(a.submitter_allocation_id, "amendments");
  }

  const out = new Map<string, MilestoneCounts>();
  for (const [id, c] of raw) {
    out.set(id, {
      speeches: c.speeches,
      points_raised: c.points,
      amendments_submitted: c.amendments,
    });
  }
  return out;
}

async function delegateCountsForMergedAllocations(
  supabase: SupabaseClient,
  conferenceIds: string[],
  mergedAllocs: Pick<AllocRow, "id" | "user_id">[]
): Promise<Map<string, MilestoneCounts>> {
  const rawCounts = await rawDelegateCountsByAllocation(supabase, conferenceIds);
  if (mergedAllocs.length === 0) return new Map();

  const { data: allAllocs } = await supabase
    .from("allocations")
    .select("id, user_id")
    .in("conference_id", conferenceIds);

  const allocationIdsByUser = new Map<string, string[]>();
  for (const a of (allAllocs ?? []) as { id: string; user_id: string | null }[]) {
    if (!a.user_id) continue;
    const arr = allocationIdsByUser.get(a.user_id) ?? [];
    arr.push(a.id);
    allocationIdsByUser.set(a.user_id, arr);
  }

  const out = new Map<string, MilestoneCounts>();
  for (const a of mergedAllocs) {
    if (a.user_id) {
      const ids = allocationIdsByUser.get(a.user_id) ?? [a.id];
      out.set(a.id, mergeMilestoneCounts(...ids.map((id) => rawCounts.get(id) ?? {})));
    } else {
      out.set(a.id, rawCounts.get(a.id) ?? {});
    }
  }
  return out;
}

function delegateRow(allocationId: string, label: string, counts: MilestoneCounts): DelegateMilestoneRow {
  const milestones = computeMilestonesForScope("delegate", counts);
  return { allocationId, label, milestones, earned: totalEarnedCheckpoints(milestones).earned };
}

async function allowedDelegateFilter(
  supabase: SupabaseClient,
  restrictAllocationIds: Set<string> | null
): Promise<(a: Pick<AllocRow, "id" | "user_id">) => boolean> {
  if (!restrictAllocationIds || restrictAllocationIds.size === 0) return () => true;

  const { data: restrictAllocs } = await supabase
    .from("allocations")
    .select("id, user_id")
    .in("id", [...restrictAllocationIds]);

  const allowedUserIds = new Set<string>();
  for (const a of (restrictAllocs ?? []) as { id: string; user_id: string | null }[]) {
    if (a.user_id) allowedUserIds.add(a.user_id);
  }

  return (a) =>
    restrictAllocationIds.has(a.id) || (a.user_id != null && allowedUserIds.has(a.user_id));
}

async function committeeGroup(
  supabase: SupabaseClient,
  canonicalConferenceId: string,
  siblingConferenceIds: string[],
  label: string,
  restrictAllocationIds: Set<string> | null,
  opts: {
    includeCommittee?: boolean;
    includeDelegates?: boolean;
    kind?: MilestoneChamberKind;
  } = {}
): Promise<CommitteeMilestoneGroup> {
  const { includeCommittee = true, includeDelegates = true, kind = "committee" } = opts;
  const scopeIds = siblingConferenceIds.length > 0 ? siblingConferenceIds : [canonicalConferenceId];

  const committee = includeCommittee
    ? computeMilestonesForScope("committee", await committeeCountsForConferences(supabase, scopeIds))
    : [];

  let delegates: DelegateMilestoneRow[] = [];
  if (includeDelegates) {
    const { data: allocs } = await supabase
      .from("allocations")
      .select("id, country, user_id, conference_id")
      .in("conference_id", scopeIds);

    const merged = mergeAllocationsAcrossSiblingConferences(
      (allocs ?? []) as AllocRow[],
      canonicalConferenceId
    );
    const allowDelegate = await allowedDelegateFilter(supabase, restrictAllocationIds);
    const countsMap = await delegateCountsForMergedAllocations(supabase, scopeIds, merged);

    delegates = merged
      .filter((a) => !isDaisSeat(a.country))
      .filter(allowDelegate)
      .map((a) => delegateRow(a.id, (a.country ?? "").trim() || "—", countsMap.get(a.id) ?? {}))
      .sort((x, y) => y.earned - x.earned || x.label.localeCompare(y.label));
  }

  return { conferenceId: canonicalConferenceId, label, kind, committee, delegates };
}

async function loadEventCanonicalCommittees(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  committees: { id: string; label: string }[];
  conferenceIdToCanonical: Map<string, string>;
}> {
  const { data: confs } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId);

  const rawConfs = ((confs ?? []) as ConfRow[]).filter(
    (c) => !isConferenceEventPlaceholderRow(c) && !isRetiredSeamunCommitteeRow(c)
  );
  const confIds = rawConfs.map((c) => c.id);
  if (confIds.length === 0) {
    return { committees: [], conferenceIdToCanonical: new Map() };
  }

  const { data: allocRows } = await supabase
    .from("allocations")
    .select("conference_id")
    .in("conference_id", confIds);

  const conferenceIdsWithAllocations = new Set(
    (allocRows ?? []).map((a) => a.conference_id).filter(Boolean) as string[]
  );

  return canonicalCommitteesForEventConferenceRows(rawConfs, conferenceIdsWithAllocations);
}

/**
 * Assemble the milestones view for the signed-in user, tailored to their role:
 *  - delegate/chair: committee-scope milestones only (no per-delegate stats)
 *  - advisor: only their assigned delegates' per-delegate milestones (no committee scope)
 *  - smt/admin: everything — committee scope + all delegates, for every committee
 */
export async function loadMilestonesForViewer(): Promise<MilestonesData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { role: "delegate", self: null, committees: [] };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role ?? "delegate").toString().toLowerCase();

  // Advisor: group assigned delegates by canonical committee (not duplicate topic rows).
  if (isAdvisorRole(role)) {
    const { data: assignments } = await supabase
      .from("advisor_delegate_assignments")
      .select("delegate_allocation_id, conference_id")
      .eq("advisor_profile_id", user.id);

    if (!assignments?.length) return { role, self: null, committees: [] };

    type AssignmentRow = { delegate_allocation_id: string; conference_id: string };
    const byCanonical = new Map<string, { label: string; siblingIds: Set<string>; allocationIds: Set<string> }>();

    for (const a of assignments as AssignmentRow[]) {
      const scope = await getCommitteeAwardScope(supabase, a.conference_id);
      const canon = scope.canonicalConferenceId;
      let bucket = byCanonical.get(canon);
      if (!bucket) {
        const { data: row } = await supabase
          .from("conferences")
          .select("committee, name")
          .eq("id", canon)
          .maybeSingle();
        bucket = {
          label: (row?.committee ?? row?.name ?? "").trim() || "Committee",
          siblingIds: new Set(scope.siblingConferenceIds),
          allocationIds: new Set<string>(),
        };
        byCanonical.set(canon, bucket);
      }
      for (const sid of scope.siblingConferenceIds) bucket.siblingIds.add(sid);
      bucket.allocationIds.add(a.delegate_allocation_id);
    }

    const committees = await Promise.all(
      [...byCanonical.entries()].map(async ([canonicalId, bucket]) => {
        const { data: confMeta } = await supabase
          .from("conferences")
          .select("committee, committee_code")
          .eq("id", canonicalId)
          .maybeSingle();
        const kind: MilestoneChamberKind = isSmtSecretariatConferenceRow({
          committee: confMeta?.committee,
          committee_code: confMeta?.committee_code,
        })
          ? "council"
          : "committee";
        return committeeGroup(
          supabase,
          canonicalId,
          [...bucket.siblingIds],
          kind === "council" ? "Secretariat Council" : bucket.label,
          bucket.allocationIds,
          { includeCommittee: false, includeDelegates: true, kind }
        );
      })
    );

    committees.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "council" ? 1 : -1;
      return compareCommitteeRowsByDifficultyThenLabel(
        { committee: a.label, name: a.label },
        { committee: b.label, name: b.label }
      );
    });
    return { role, self: null, committees };
  }

  // SMT / admin: committees + secretariat council for the active event.
  if (isSmtRole(role) || isAdminRole(role)) {
    const eventId = await getActiveEventId();
    if (!eventId) return { role, self: null, committees: [] };

    const { committees: canonicalCommittees, conferenceIdToCanonical } =
      await loadEventCanonicalCommittees(supabase, eventId);

    const confIds = canonicalCommittees.map((c) => c.id);
    const { data: confMetaRows } = confIds.length
      ? await supabase
          .from("conferences")
          .select("id, committee, committee_code")
          .in("id", confIds)
      : { data: [] as { id: string; committee: string | null; committee_code: string | null }[] };
    const metaById = new Map(
      (confMetaRows ?? []).map((r) => [r.id, r] as const)
    );

    const committees = await Promise.all(
      canonicalCommittees.map((c) => {
        const meta = metaById.get(c.id);
        const isCouncil = isSmtSecretariatConferenceRow({
          committee: meta?.committee ?? c.label,
          committee_code: meta?.committee_code,
        });
        return committeeGroup(
          supabase,
          c.id,
          siblingConferenceIdsForCanonical(c.id, conferenceIdToCanonical),
          isCouncil ? "Secretariat Council" : c.label,
          null,
          { kind: isCouncil ? "council" : "committee" }
        );
      })
    );

    committees.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "council" ? 1 : -1;
      const aCommittee = metaById.get(a.conferenceId)?.committee ?? a.label;
      const bCommittee = metaById.get(b.conferenceId)?.committee ?? b.label;
      return compareCommitteeRowsByDifficultyThenLabel(
        { committee: aCommittee, name: a.label },
        { committee: bCommittee, name: b.label }
      );
    });

    return { role, self: null, committees };
  }

  // Delegate / chair: dashboard committee milestones; delegates also get personal progress.
  const conf = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!conf) return { role, self: null, committees: [] };

  const scope = await getCommitteeAwardScope(supabase, conf.id);
  const isCouncil = isSmtSecretariatConferenceRow({
    committee: conf.committee,
    committee_code: conf.committee_code,
  });
  const label = isCouncil
    ? "Secretariat Council"
    : (conf.committee ?? conf.name ?? "").trim() || "Committee";

  const group = await committeeGroup(
    supabase,
    scope.canonicalConferenceId,
    scope.siblingConferenceIds,
    label,
    null,
    {
      includeCommittee: true,
      includeDelegates: false,
      kind: isCouncil ? "council" : "committee",
    }
  );

  let self: DelegateMilestoneRow | null = null;
  if (role === "delegate") {
    const { data: myAllocs } = await supabase
      .from("allocations")
      .select("id, country, user_id, conference_id")
      .in("conference_id", scope.siblingConferenceIds)
      .eq("user_id", user.id);

    const merged = mergeAllocationsAcrossSiblingConferences(
      (myAllocs ?? []) as AllocRow[],
      scope.canonicalConferenceId
    ).filter((a) => !isDaisSeat(a.country));

    const primary = merged[0];
    if (primary) {
      const countsMap = await delegateCountsForMergedAllocations(
        supabase,
        scope.siblingConferenceIds,
        merged
      );
      self = delegateRow(
        primary.id,
        (primary.country ?? "").trim() || "—",
        countsMap.get(primary.id) ?? {}
      );
    }
  }

  return { role, self, committees: [group] };
}
