import { createClient } from "@/lib/supabase/server";
import { ChatsNotesView } from "@/components/chats-notes/ChatsNotesView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";

export default async function ChatsNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const conferenceId = await requireActiveConferenceId();

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("note_type", "chat")
    .order("updated_at", { ascending: false });

  const { data: voteItems } = await supabase
    .from("vote_items")
    .select("*")
    .eq("conference_id", conferenceId)
    .is("closed_at", null)
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Chats/Notes">
      <ChatsNotesView initialNotes={notes || []} voteItems={voteItems || []} />
    </MunPageShell>
  );
}
