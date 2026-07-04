import type { SupabaseClient } from "@supabase/supabase-js";
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

/** Every linked country seat that chairs must score (nomination status irrelevant). */
export function filterAllocationsToScorableDelegates(rows: AllocationRow[]): AllocationRow[] {
  return rows.filter((row) => {
    if (!row.user_id) return false;
    return !isNonScorableAllocationRole(profileEmbed(row.profiles)?.role);
  });
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
