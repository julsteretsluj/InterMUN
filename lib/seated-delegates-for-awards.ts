import type { SupabaseClient } from "@supabase/supabase-js";
import { committeeTabKey } from "@/lib/conference-committee-canonical";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import { evaluateDelegateMatrixReadiness } from "@/lib/award-participation-scoring";
import { dedupeAllocationsByUserId } from "@/lib/conference-committee-canonical";

/** Roles seated in committee but excluded from the chair delegate scoring matrix. */
export const NON_SCORABLE_ALLOCATION_ROLES = new Set(["chair", "smt", "admin", "advisor"]);

export type ScorableDelegateRow = {
  userId: string;
  country: string;
  displayName: string;
};

type AllocationRow = {
  id: string;
  user_id: string | null;
  country: string;
  profiles:
    | { name: string | null; role?: string | null }
    | { name: string | null; role?: string | null }[]
    | null;
};

function profileEmbed(profiles: AllocationRow["profiles"]) {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] : profiles;
}

export function isNonScorableAllocationRole(role: string | null | undefined): boolean {
  const normalized = role?.toString().trim().toLowerCase();
  return normalized != null && NON_SCORABLE_ALLOCATION_ROLES.has(normalized);
}

/** Dais / chair placard labels — not delegate country seats. */
export function isChairAllocationSeatLabel(country: string | null | undefined): boolean {
  const normalized = country?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return (
    normalized === "head chair" ||
    normalized === "co-chair" ||
    normalized === "co chair" ||
    normalized.includes("chair")
  );
}

export function isScorableAllocationSeat(
  country: string | null | undefined,
  role: string | null | undefined,
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  if (isChairAllocationSeatLabel(country)) return false;
  return !isNonScorableAllocationRole(role);
}

/** Every linked country seat that chairs must score (nomination status irrelevant). */
export function filterAllocationsToScorableDelegates(rows: AllocationRow[]): AllocationRow[] {
  return rows.filter((row) => isScorableAllocationSeat(row.country, profileEmbed(row.profiles)?.role, row.user_id));
}

export function scorableDelegatesFromAllocations(rows: AllocationRow[]): ScorableDelegateRow[] {
  const deduped = dedupeAllocationsByUserId(sortRowsByAllocationCountry(rows));
  return filterAllocationsToScorableDelegates(deduped).map((row) => {
    const embed = profileEmbed(row.profiles);
    const displayName = embed?.name?.trim() || row.user_id!.slice(0, 8);
    return {
      userId: row.user_id!,
      country: row.country,
      displayName,
    };
  });
}

export async function fetchScorableDelegatesForCommittee(
  supabase: SupabaseClient,
  siblingConferenceIds: string[]
): Promise<ScorableDelegateRow[]> {
  if (siblingConferenceIds.length === 0) return [];
  const { data: delegates } = await supabase
    .from("allocations")
    .select("id, user_id, country, profiles(name, role)")
    .in("conference_id", siblingConferenceIds)
    .not("user_id", "is", null)
    .order("country", { ascending: true });
  return scorableDelegatesFromAllocations((delegates ?? []) as AllocationRow[]);
}

export async function fetchScorableDelegateProfileIds(
  supabase: SupabaseClient,
  siblingConferenceIds: string[]
): Promise<string[]> {
  const rows = await fetchScorableDelegatesForCommittee(supabase, siblingConferenceIds);
  return rows.map((row) => row.userId);
}

/** True when subject has a linked allocation seat in this committee (sibling rows included). */
export async function isSubjectScorableDelegateInCommittee(
  supabase: SupabaseClient,
  siblingConferenceIds: string[],
  subjectProfileId: string
): Promise<boolean> {
  if (siblingConferenceIds.length === 0 || !subjectProfileId.trim()) return false;

  const { data: targetConfs } = await supabase
    .from("conferences")
    .select("id, event_id, name, committee, committee_code")
    .in("id", siblingConferenceIds);
  if (!targetConfs?.length) return false;

  const targetTabKeys = new Set(targetConfs.map((c) => committeeTabKey(c)));
  const eventId = targetConfs[0]?.event_id;
  if (!eventId) return false;

  const siblingSet = new Set(siblingConferenceIds);

  const { data: allocRows } = await supabase
    .from("allocations")
    .select("country, user_id, conference_id")
    .eq("user_id", subjectProfileId);

  if (!allocRows?.length) return false;

  const conferenceIds = [...new Set(allocRows.map((row) => row.conference_id).filter(Boolean))];
  const { data: confRows } = await supabase
    .from("conferences")
    .select("id, event_id, name, committee, committee_code")
    .in("id", conferenceIds);

  const confById = new Map((confRows ?? []).map((c) => [c.id, c]));

  const inCommittee = allocRows.filter((row) => {
    const conf = confById.get(row.conference_id);
    if (!conf || conf.event_id !== eventId) return false;
    if (siblingSet.has(row.conference_id)) return true;
    return targetTabKeys.has(committeeTabKey(conf));
  });

  if (!inCommittee.length) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", subjectProfileId)
    .maybeSingle();

  const role = profile?.role?.toString() ?? null;
  return inCommittee.some((row) => isScorableAllocationSeat(row.country, role, row.user_id));
}

export async function getCommitteeDelegateMatrixStatus(
  supabase: SupabaseClient,
  canonicalConferenceId: string,
  siblingConferenceIds: string[]
): Promise<{ ok: boolean; missing: string[]; total: number }> {
  const profileIds = await fetchScorableDelegateProfileIds(supabase, siblingConferenceIds);
  if (profileIds.length === 0) {
    return { ok: true, missing: [], total: 0 };
  }
  const { data: mxRows } = await supabase
    .from("award_participation_scores")
    .select("subject_profile_id, rubric_scores")
    .eq("committee_conference_id", canonicalConferenceId)
    .eq("scope", "delegate_by_chair");
  const result = evaluateDelegateMatrixReadiness(profileIds, mxRows ?? []);
  return { ok: result.ok, missing: result.missing, total: profileIds.length };
}
