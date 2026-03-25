import { createClient } from "@/lib/supabase/server";
import { ChatsNotesView } from "@/components/chats-notes/ChatsNotesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { requireActiveConferenceId } from "@/lib/active-conference";

export default async function ChatsNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const conferenceId = await requireActiveConferenceId();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <MunPageShell title="Notes">
      <ChatsNotesView
        conferenceId={conferenceId}
        initialMessages={messages || []}
        myUserId={user.id}
        myRole={(profile?.role || "delegate").toString().toLowerCase()}
      />
    </MunPageShell>
  );
}

