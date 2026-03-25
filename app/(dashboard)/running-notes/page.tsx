import { createClient } from "@/lib/supabase/server";
import { RunningNotesView } from "@/components/running-notes/RunningNotesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";

export default async function RunningNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role) redirect("/login");

  const myRole = profile.role.toString().toLowerCase();
  const canViewAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  let notesQuery = supabase.from("notes").select("*").eq("note_type", "running");
  if (!canViewAll) notesQuery = notesQuery.eq("user_id", user.id);
  const { data: notes } = await notesQuery.order("updated_at", { ascending: false });

  return (
    <MunPageShell title="Running Notes">
      <RunningNotesView notes={notes || []} currentUserId={user.id} myRole={myRole} />
    </MunPageShell>
  );
}
