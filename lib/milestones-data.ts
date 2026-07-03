import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isAdvisorRole, isAdminRole, isSmtRole, isChairRole } from "@/lib/roles";
import { DAIS_SEAT_CO_CHAIR, DAIS_SEAT_HEAD_CHAIR } from "@/lib/allocation-display-order";
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

export type CommitteeMilestoneGroup = {
  conferenceId: string;
  label: string;
  committee: MilestoneProgress[];
  delegates: DelegateMilestoneRow[];
};

export type MilestonesData = {
  role: string;
  self: DelegateMilestoneRow | null;
  committees: CommitteeMilestoneGroup[];
};

type AllocRow = { id: string; country: string | null; user_id: string | null };

function isDaisSeat(country: string | null): boolean {
  const key = (country ?? "").trim().toLowerCase();
  return (
    key === DAIS_SEAT_HEAD_CHAIR.toLowerCase() ||
    key === DAIS_SEAT_CO_CHAIR.toLowerCase() ||
    key === "co chair"
  );
}

/** Committee-scope counts from vote_items (single query). */
async function committeeCounts(supabase: SupabaseClient, conferenceId: string): Promise<MilestoneCounts> {
  const { data } = await supabase
    .from("vote_items")
    .select("procedure_code, vote_type, outcome, closed_at")
    .eq("conference_id", conferenceId);
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
  };
}

/** Per-delegate counts for a whole committee (two queries, aggregated in JS). */
async function delegateCountsByAllocation(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<Map<string, MilestoneCounts>> {
  const raw = new Map<string, { speeches: number; points: number }>();
  const bump = (id: string | null, key: "speeches" | "points") => {
    if (!id) return;
    const e = raw.get(id) ?? { speeches: 0, points: 0 };
    e[key] += 1;
    raw.set(id, e);
  };

  const [{ data: speeches }, { data: points }] = await Promise.all([
    supabase.from("committee_speech_events").select("allocation_id").eq("conference_id", conferenceId),
    supabase
      .from("chair_session_points")
      .select("raised_by_allocation_id, point_code")
      .eq("conference_id", conferenceId)
      .in("point_code", ["poi", "poc"]),
  ]);

  for (const s of (speeches ?? []) as { allocation_id: string | null }[]) bump(s.allocation_id, "speeches");
  for (const p of (points ?? []) as { raised_by_allocation_id: string | null }[]) {
    bump(p.raised_by_allocation_id, "points");
  }

  const out = new Map<string, MilestoneCounts>();
  for (const [id, c] of raw) out.set(id, { speeches: c.speeches, points_raised: c.points });
  return out;
}

/** Single-delegate counts (RLS-scoped; delegate reads their own rows). */
async function singleDelegateCounts(
  supabase: SupabaseClient,
  allocationId: string
): Promise<MilestoneCounts> {
  const [{ count: speeches }, { count: points }] = await Promise.all([
    supabase
      .from("committee_speech_events")
      .select("id", { count: "exact", head: true })
      .eq("allocation_id", allocationId),
    supabase
      .from("chair_session_points")
      .select("id", { count: "exact", head: true })
      .eq("raised_by_allocation_id", allocationId)
      .in("point_code", ["poi", "poc"]),
  ]);
  return { speeches: speeches ?? 0, points_raised: points ?? 0 };
}

function delegateRow(allocationId: string, label: string, counts: MilestoneCounts): DelegateMilestoneRow {
  const milestones = computeMilestonesForScope("delegate", counts);
  return { allocationId, label, milestones, earned: totalEarnedCheckpoints(milestones).earned };
}

async function committeeGroup(
  supabase: SupabaseClient,
  conferenceId: string,
  label: string,
  restrictAllocationIds: Set<string> | null
): Promise<CommitteeMilestoneGroup> {
  const committee = computeMilestonesForScope("committee", await committeeCounts(supabase, conferenceId));

  const { data: allocs } = await supabase
    .from("allocations")
    .select("id, country, user_id")
    .eq("conference_id", conferenceId);
  const countsMap = await delegateCountsByAllocation(supabase, conferenceId);

  const delegates: DelegateMilestoneRow[] = ((allocs ?? []) as AllocRow[])
    .filter((a) => !isDaisSeat(a.country))
    .filter((a) => (restrictAllocationIds ? restrictAllocationIds.has(a.id) : true))
    .map((a) => delegateRow(a.id, (a.country ?? "").trim() || "—", countsMap.get(a.id) ?? {}))
    .sort((x, y) => y.earned - x.earned || x.label.localeCompare(y.label));

  return { conferenceId, label, committee, delegates };
}

/**
 * Assemble the milestones view for the signed-in user, tailored to their role:
 *  - delegate: their committee's progress + their own per-delegate milestones
 *  - chair: their committee's progress + a per-delegate leaderboard
 *  - advisor: committees of their assigned delegates + those delegates' milestones
 *  - smt/admin: every committee in the active event
 */
export async function loadMilestonesForViewer(): Promise<MilestonesData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { role: "delegate", self: null, committees: [] };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role ?? "delegate").toString().toLowerCase();

  // Advisor: group by their assigned delegates' conferences.
  if (isAdvisorRole(role)) {
    const { data: assignments } = await supabase
      .from("advisor_delegate_assignments")
      .select("delegate_allocation_id, conference_id")
      .eq("advisor_profile_id", user.id);
    const byConf = new Map<string, Set<string>>();
    for (const a of (assignments ?? []) as { delegate_allocation_id: string; conference_id: string }[]) {
      const set = byConf.get(a.conference_id) ?? new Set<string>();
      set.add(a.delegate_allocation_id);
      byConf.set(a.conference_id, set);
    }
    const confIds = [...byConf.keys()];
    const labels = await conferenceLabels(supabase, confIds);
    const committees = await Promise.all(
      confIds.map((id) => committeeGroup(supabase, id, labels.get(id) ?? "Committee", byConf.get(id) ?? null))
    );
    return { role, self: null, committees };
  }

  // SMT / admin: every committee in the active event.
  if (isSmtRole(role) || isAdminRole(role)) {
    const eventId = await getActiveEventId();
    if (!eventId) return { role, self: null, committees: [] };
    const { data: confs } = await supabase
      .from("conferences")
      .select("id, name, committee")
      .eq("event_id", eventId)
      .order("committee", { ascending: true, nullsFirst: false });
    const committees = await Promise.all(
      ((confs ?? []) as { id: string; name: string; committee: string | null }[]).map((c) =>
        committeeGroup(supabase, c.id, (c.committee ?? c.name ?? "").trim() || "Committee", null)
      )
    );
    return { role, self: null, committees };
  }

  // Delegate / chair: their dashboard committee.
  const conf = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!conf) return { role, self: null, committees: [] };
  const label = (conf.committee ?? conf.name ?? "").trim() || "Committee";

  let self: DelegateMilestoneRow | null = null;
  const { data: myAlloc } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", conf.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (myAlloc?.id) {
    self = delegateRow(
      myAlloc.id,
      (myAlloc.country ?? "").trim() || "—",
      await singleDelegateCounts(supabase, myAlloc.id)
    );
  }

  // Chairs see the full leaderboard; delegates only see the committee aggregate + self.
  const group = isChairRole(role)
    ? await committeeGroup(supabase, conf.id, label, null)
    : {
        conferenceId: conf.id,
        label,
        committee: computeMilestonesForScope("committee", await committeeCounts(supabase, conf.id)),
        delegates: [] as DelegateMilestoneRow[],
      };

  return { role, self, committees: [group] };
}

async function conferenceLabels(
  supabase: SupabaseClient,
  conferenceIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (conferenceIds.length === 0) return map;
  const { data } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .in("id", conferenceIds);
  for (const c of (data ?? []) as { id: string; name: string; committee: string | null }[]) {
    map.set(c.id, (c.committee ?? c.name ?? "").trim() || "Committee");
  }
  return map;
}
