import type { SupabaseClient } from "@supabase/supabase-js";

export type AdvisorAssignmentRow = {
  id: string;
  advisor_profile_id: string;
  delegate_allocation_id: string;
  conference_id: string;
  delegate_user_id: string | null;
  delegate_country: string;
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
        user_id
      )
    `
    )
    .eq("advisor_profile_id", advisorProfileId);

  if (error || !data) return [];

  return data.flatMap((row) => {
    const allocRaw = row.allocations as
      | { country: string; user_id: string | null }
      | { country: string; user_id: string | null }[];
    const alloc = Array.isArray(allocRaw) ? allocRaw[0] : allocRaw;
    if (!alloc) return [];
    return [
      {
        id: row.id,
        advisor_profile_id: row.advisor_profile_id,
        delegate_allocation_id: row.delegate_allocation_id,
        conference_id: row.conference_id,
        delegate_user_id: alloc.user_id,
        delegate_country: alloc.country,
        advisor_name: null,
      },
    ];
  });
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
