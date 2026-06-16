import type { SupabaseClient } from "@supabase/supabase-js";

const DELEGATE_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdvisorAssignmentRow = {
  id: string;
  advisor_profile_id: string;
  delegate_allocation_id: string;
  conference_id: string;
  delegate_user_id: string | null;
  delegate_country: string;
  delegate_name: string | null;
  committee: string | null;
  advisor_name: string | null;
};

export async function fetchAdvisorAssignmentsForAdvisor(
  supabase: SupabaseClient,
  advisorProfileId: string
): Promise<AdvisorAssignmentRow[]> {
  const { data, error } = await supabase
    .from("advisor_delegate_assignments")
    .select(
      `
      id,
      advisor_profile_id,
      delegate_allocation_id,
      conference_id,
      allocations!inner (
        country,
        user_id,
        conferences:conference_id (
          committee
        ),
        profiles:user_id (
          name
        )
      )
    `
    )
    .eq("advisor_profile_id", advisorProfileId);

  if (error || !data) return [];

  return data.flatMap((row) => {
    const allocRaw = row.allocations as
      | {
          country: string;
          user_id: string | null;
          conferences: { committee: string | null } | { committee: string | null }[] | null;
          profiles: { name: string | null } | { name: string | null }[] | null;
        }
      | {
          country: string;
          user_id: string | null;
          conferences: { committee: string | null } | { committee: string | null }[] | null;
          profiles: { name: string | null } | { name: string | null }[] | null;
        }[];
    const alloc = Array.isArray(allocRaw) ? allocRaw[0] : allocRaw;
    if (!alloc) return [];

    const confRaw = alloc.conferences;
    const conf = Array.isArray(confRaw) ? confRaw[0] : confRaw;
    const profRaw = alloc.profiles;
    const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw;

    return [
      {
        id: row.id,
        advisor_profile_id: row.advisor_profile_id,
        delegate_allocation_id: row.delegate_allocation_id,
        conference_id: row.conference_id,
        delegate_user_id: alloc.user_id,
        delegate_country: alloc.country,
        delegate_name: prof?.name?.trim() || null,
        committee: conf?.committee?.trim() || null,
        advisor_name: null,
      },
    ];
  });
}

export function isDelegateUserIdParam(value: string): boolean {
  return DELEGATE_USER_ID_RE.test(value.trim());
}

export async function fetchAdvisorAssignmentForDelegateUser(
  supabase: SupabaseClient,
  advisorProfileId: string,
  delegateUserId: string
): Promise<AdvisorAssignmentRow | null> {
  if (!isDelegateUserIdParam(delegateUserId)) return null;
  const assignments = await fetchAdvisorAssignmentsForAdvisor(supabase, advisorProfileId);
  return assignments.find((a) => a.delegate_user_id === delegateUserId) ?? null;
}

export async function fetchAdvisorForAllocation(
  supabase: SupabaseClient,
  allocationId: string
): Promise<{ advisor_profile_id: string; name: string | null } | null> {
  const { data, error } = await supabase
    .from("advisor_delegate_assignments")
    .select("advisor_profile_id, profiles:advisor_profile_id ( name )")
    .eq("delegate_allocation_id", allocationId)
    .maybeSingle();

  if (error || !data) return null;
  const profRaw = data.profiles as { name: string | null } | { name: string | null }[] | null;
  const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw;
  return {
    advisor_profile_id: data.advisor_profile_id,
    name: prof?.name ?? null,
  };
}
