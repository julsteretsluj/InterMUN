import { createClient } from "@/lib/supabase/server";
import { RunningNotesView } from "@/components/running-notes/RunningNotesView";
import { MunPageShell } from "@/components/MunPageShell";

export default async function RunningNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("note_type", "running")
    .order("updated_at", { ascending: false });

  return (
    <MunPageShell title="Running Notes">
      <RunningNotesView notes={notes || []} />
    </MunPageShell>
  );
}
