import { createClient } from "@/lib/supabase/server";
import { ChatsNotesView } from "@/components/chats-notes/ChatsNotesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";

export default async function ChatsNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("note_type", "chat")
    .order("updated_at", { ascending: false });

  return (
    <MunPageShell title="seamunnotes.com / https://seamun-chat.vercel.app/">
      <ChatsNotesView initialNotes={notes || []} />
    </MunPageShell>
  );
}

