import type { SupabaseClient } from "@supabase/supabase-js";
import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import {
  committeeHintForSmtDaisPlan,
  isSmtSecretariatConferenceRow,
} from "@/lib/smt-conference-filters";

type ConfRow = {
  id: string;
  name: string | null;
  committee: string | null;
  committee_code?: string | null;
};

/** One tab / bucket for all secretariat conference rows (same as allocation matrix). */
export const SMT_COMMITTEE_TAB_KEY = "__smt_secretariat_sheet__";

/** Normalize chamber label for stable sibling matching (same committee, different topic rows). */
function normalizeCommitteeLabelForBucket(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const alias: Record<string, string> = {
    "economic and social council": "ecosoc",
    "un ecosoc": "ecosoc",
    ecosoc: "ecosoc",
    "disarmament and international security committee": "disec",
    "united nations security council": "unsc",
    "security council": "unsc",
    "united nations human rights council": "unhrc",
    "human rights council": "unhrc",
    "world health organization": "who",
    "united nations office on drugs and crime": "unodc",
    "un women": "un women",
    unwomen: "un women",
    "eu parliament": "eu parli",
  };
  return alias[s] ?? s;
}

/**
 * Committee bucketing key: same *chamber* across topic rows (e.g. "ECOSOC — Topic A" vs "ECOSOC — Topic B"),
 * awards, allocation matrix, and DB `committee_tab_key` / peer RLS must stay aligned.
 */
export function committeeTabKey(c: Pick<ConfRow, "id" | "name" | "committee" | "committee_code">): string {
  if (isSmtSecretariatConferenceRow(c)) return SMT_COMMITTEE_TAB_KEY;
  const hinted = committeeHintForSmtDaisPlan(c);
  const g = committeeSessionGroupKey(hinted ?? c.committee);
  if (g) return `chamber:${g}`;
  const comm = c.committee?.trim();
  if (comm) return `c:${normalizeCommitteeLabelForBucket(comm)}`;
  const code = c.committee_code?.trim().toLowerCase();
  if (code) return `code:${code}`;
  const n = c.name?.trim().toLowerCase();
  if (n) return `n:${n}`;
  return `id:${c.id}`;
}

/** Prefer the row that already holds the roster; tie-break by linked delegates then row count. */
export function pickCanonicalConferenceRowByAllocationScore<T extends { id: string }>(
  groupRows: T[],
  allocationRowCountByConferenceId: Map<string, number>,
  linkedUserCountByConferenceId: Map<string, number>
): T {
  let primary = groupRows[0]!;
  let bestScore = -1;
  for (const r of groupRows) {
    const rowsN = allocationRowCountByConferenceId.get(r.id) ?? 0;
    const linkedN = linkedUserCountByConferenceId.get(r.id) ?? 0;
    const score = rowsN > 0 ? linkedN * 10000 + rowsN : -1;
    if (score > bestScore) {
      bestScore = score;
      primary = r;
    }
  }
  return primary;
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
  T extends { id: string; name: string | null; committee: string | null; committee_code?: string | null },
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
    .select("id, event_id, name, committee, committee_code")
    .eq("id", conferenceId)
    .maybeSingle();

  if (!row?.event_id) {
    return { canonicalConferenceId: conferenceId, siblingConferenceIds: [conferenceId] };
  }

  const { data: eventRows } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", row.event_id);

  const group = (eventRows ?? []).filter((c) => committeeTabKey(c) === committeeTabKey(row));
  if (group.length <= 1) {
    return { canonicalConferenceId: conferenceId, siblingConferenceIds: [conferenceId] };
  }

  const ids = group.map((c) => c.id);
  const { data: allocSummaries } = await supabase
    .from("allocations")
    .select("conference_id, user_id")
    .in("conference_id", ids);

  const allocationRowCountByConferenceId = new Map<string, number>();
  const linkedUserCountByConferenceId = new Map<string, number>();
  for (const a of allocSummaries ?? []) {
    if (!a.conference_id) continue;
    allocationRowCountByConferenceId.set(
      a.conference_id,
      (allocationRowCountByConferenceId.get(a.conference_id) ?? 0) + 1
    );
    if (a.user_id) {
      linkedUserCountByConferenceId.set(
        a.conference_id,
        (linkedUserCountByConferenceId.get(a.conference_id) ?? 0) + 1
      );
    }
  }

  const primary = pickCanonicalConferenceRowByAllocationScore(
    group,
    allocationRowCountByConferenceId,
    linkedUserCountByConferenceId
  );

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

/**
 * Duplicate `conferences` rows for one chamber can each carry part of the roster and placard codes.
 * Merge sibling allocation rows into one view: one row per linked user, one per unlinked seat label.
 * When duplicates exist, prefer the row on `canonicalConferenceId`.
 */
export function mergeAllocationsAcrossSiblingConferences<
  T extends {
    id: string;
    country: string | null;
    user_id: string | null;
    conference_id: string;
  },
>(rows: T[], canonicalConferenceId: string): T[] {
  const prefer = (prev: T, next: T): T => {
    if (prev.conference_id === canonicalConferenceId) return prev;
    if (next.conference_id === canonicalConferenceId) return next;
    return prev;
  };

  const byUser = new Map<string, T>();
  const byCountryOnly = new Map<string, T>();

  for (const r of rows) {
    const uid = r.user_id?.trim();
    if (uid) {
      const prev = byUser.get(uid);
      if (!prev) byUser.set(uid, r);
      else byUser.set(uid, prefer(prev, r));
      continue;
    }
    const ck = (r.country ?? "").trim().toLowerCase() || `__id:${r.id}`;
    const prev = byCountryOnly.get(ck);
    if (!prev) byCountryOnly.set(ck, r);
    else byCountryOnly.set(ck, prefer(prev, r));
  }

  return [...byUser.values(), ...byCountryOnly.values()];
}
