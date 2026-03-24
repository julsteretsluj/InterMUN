import { createClient } from "@/lib/supabase/server";
import { StancesView } from "@/components/stances/StancesView";

export default async function StancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: allocations } = await supabase
    .from("allocations")
    .select("*")
    .eq("user_id", user.id);

  const allocationIds = (allocations || []).map((a) => a.id);
  const { data: stanceNotes } = allocationIds.length
    ? await supabase
        .from("notes")
        .select("*")
        .in("allocation_id", allocationIds)
        .eq("note_type", "stance")
    : { data: [] };

  const allocationsWithNotes = (allocations || []).map((a) => ({
    ...a,
    notes: (stanceNotes || []).filter((n) => n.allocation_id === a.id),
  }));

  const { data: profile } = await supabase
    .from("profiles")
    .select("stance_overview")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Stances</h2>
      <StancesView
        allocations={allocationsWithNotes}
        stanceOverview={profile?.stance_overview || {}}
      />
    </div>
  );
}
