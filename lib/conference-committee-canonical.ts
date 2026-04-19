import type { SupabaseClient } from "@supabase/supabase-js";

type ConfRow = { id: string; name: string | null; committee: string | null };

/** Same tab key as SMT allocation matrix: one tab per committee name (not per topic / conference name). */
export function committeeTabKey(c: Pick<ConfRow, "id" | "name" | "committee">): string {
  const comm = c.committee?.trim().toLowerCase();
  if (comm) return `c:${comm}`;
  const n = c.name?.trim().toLowerCase();
  if (n) return `n:${n}`;
  return `id:${c.id}`;
}

export type CommitteeAwardScope = {
  /** Single `conferences.id` used for all award_nominations rows for this committee (prefers row with allocations). */
  canonicalConferenceId: string;
  /** All conference rows in the same event that share this committee tab (topic duplicates). */
  siblingConferenceIds: string[];
};

export type CanonicalCommitteeRow = { id: string; label: string };

/**
 * Collapses duplicate `conferences` rows that share one committee tab (different topics/names) into a single
 * canonical `conferences.id` per committee — same bucketing as the allocation matrix and committee awards.
 */
export function canonicalCommitteesForEventConferenceRows<
  T extends { id: string; name: string | null; committee: string | null },
>(rows: T[], conferenceIdsWithAllocations: Set<string>): {
  committees: CanonicalCommitteeRow[];
  conferenceIdToCanonical: Map<string, string>;
} {
  const byKey = new Map<string, T[]>();
  for (const c of rows) {
    const k = committeeTabKey(c);
    const arr = byKey.get(k) ?? [];
    arr.push(c);
    byKey.set(k, arr);
  }

  const conferenceIdToCanonical = new Map<string, string>();
  const committees: CanonicalCommitteeRow[] = [];

  for (const [, group] of byKey) {
    let primary = group[0]!;
    let primaryHas = conferenceIdsWithAllocations.has(primary.id);
    for (const r of group) {
      const rHas = conferenceIdsWithAllocations.has(r.id);
      if (rHas && !primaryHas) {
        primary = r;
        primaryHas = true;
      }
    }
    const canonicalId = primary.id;
    const label = primary.committee?.trim() || primary.name?.trim() || primary.id.slice(0, 8);
    committees.push({ id: canonicalId, label });
    for (const m of group) {
      conferenceIdToCanonical.set(m.id, canonicalId);
    }
  }

  committees.sort((a, b) => a.label.localeCompare(b.label));
  return { committees, conferenceIdToCanonical };
}

/**
 * Resolves the canonical conference row for committee-scoped awards: duplicate `conferences` rows
 * (same `committee`, different `name`/topic) share one awards bucket and one roster for nominees.
 */
export async function getCommitteeAwardScope(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<CommitteeAwardScope> {
  const { data: row } = await supabase
    .from("conferences")
    .select("id, event_id, name, committee")
    .eq("id", conferenceId)
    .maybeSingle();

  if (!row?.event_id) {
    return { canonicalConferenceId: conferenceId, siblingConferenceIds: [conferenceId] };
  }

  const { data: eventRows } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("event_id", row.event_id);

  const group = (eventRows ?? []).filter((c) => committeeTabKey(c) === committeeTabKey(row));
  if (group.length <= 1) {
    return { canonicalConferenceId: conferenceId, siblingConferenceIds: [conferenceId] };
  }

  const ids = group.map((c) => c.id);
  const { data: allocRows } = await supabase.from("allocations").select("conference_id").in("conference_id", ids);
  const hasAlloc = new Set((allocRows ?? []).map((a) => a.conference_id).filter(Boolean) as string[]);

  let primary = group[0]!;
  let primaryHas = hasAlloc.has(primary.id);
  for (const r of group) {
    const rHas = hasAlloc.has(r.id);
    if (rHas && !primaryHas) {
      primary = r;
      primaryHas = true;
    }
  }

  return {
    canonicalConferenceId: primary.id,
    siblingConferenceIds: ids,
  };
}

/** Normalize any conference id to the canonical committee row for writes (nominations, assignments). */
export async function resolveCanonicalCommitteeConferenceId(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<string> {
  const { canonicalConferenceId } = await getCommitteeAwardScope(supabase, conferenceId);
  return canonicalConferenceId;
}

/** One nomination row per (type, rank): prefer canonical `conferences.id`, then stable id order. */
export function mergeNominationRowsForCommitteeDisplay<
  T extends {
    id: string;
    nomination_type: string;
    rank: number;
    committee_conference_id: string;
  },
>(rows: T[], canonicalConferenceId: string): T[] {
  const map = new Map<string, T>();
  for (const n of rows) {
    const key = `${n.nomination_type}:${n.rank}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, n);
      continue;
    }
    const prevCanon = prev.committee_conference_id === canonicalConferenceId;
    const nextCanon = n.committee_conference_id === canonicalConferenceId;
    if (nextCanon && !prevCanon) {
      map.set(key, n);
    } else if (nextCanon === prevCanon && n.id.localeCompare(prev.id) < 0) {
      map.set(key, n);
    }
  }
  return [...map.values()].sort((a, b) => {
    const t = a.nomination_type.localeCompare(b.nomination_type);
    if (t !== 0) return t;
    return a.rank - b.rank;
  });
}

/** Same delegate on duplicate topic rows → one roster line (canonical committee roster). */
export function dedupeAllocationsByUserId<T extends { user_id: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (!r.user_id) {
      out.push(r);
      continue;
    }
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    out.push(r);
  }
  return out;
}
