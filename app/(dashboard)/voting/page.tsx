import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { redirect } from "next/navigation";

export default async function VotingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conferenceId = await requireActiveConferenceId();

  const { data: voteItems } = await supabase
    .from("vote_items")
    .select("*")
    .eq("conference_id", conferenceId)
    .is("closed_at", null)
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Voting">
      <VotingPanel voteItems={voteItems || []} />
    </MunPageShell>
  );
}

