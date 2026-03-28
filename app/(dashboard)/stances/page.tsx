import { createClient } from "@/lib/supabase/server";
import { StancesView } from "@/components/stances/StancesView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";

export default async function StancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const conferenceId = await requireActiveConferenceId();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canViewAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  let allocationsQuery = supabase
    .from("allocations")
    .select("*")
    .eq("conference_id", conferenceId);
  if (!canViewAll) allocationsQuery = allocationsQuery.eq("user_id", user.id);
  const { data: allocations } = await allocationsQuery;

  const allocationIds = (allocations || []).map((a) => a.id);
  const { data: stanceNotes } = allocationIds.length
    ? await supabase
        .from("notes")
        .select("*")
        .in("allocation_id", allocationIds)
        .eq("note_type", "stance")
    : { data: [] };

  const allocationsWithNotes = sortRowsByAllocationCountry(
    (allocations || []).map((a) => ({
      ...a,
      notes: (stanceNotes || []).filter((n) => n.allocation_id === a.id),
    }))
  );

  const delegateIds = Array.from(
    new Set((allocations || []).map((a) => a.user_id).filter((id): id is string => Boolean(id)))
  );

  let stanceOverviewByUser: Record<string, Record<string, number>> = {};
  if (canViewAll) {
    const { data: delegates } =
      delegateIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, stance_overview")
            .in("id", delegateIds)
        : { data: [] as { id: string; stance_overview: Record<string, number> | null }[] };
    stanceOverviewByUser = Object.fromEntries(
      (delegates ?? []).map((p) => [p.id, p.stance_overview || {}])
    );
  } else {
    const { data: myStance } = await supabase
      .from("profiles")
      .select("stance_overview")
      .eq("id", user.id)
      .single();
    stanceOverviewByUser = { [user.id]: (myStance?.stance_overview as Record<string, number>) || {} };
  }

  return (
    <MunPageShell title="Stances">
      <StancesView
        allocations={allocationsWithNotes}
        stanceOverviewByUser={stanceOverviewByUser}
        currentUserId={user.id}
        canEdit={myRole === "delegate"}
      />
    </MunPageShell>
  );
}
