import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AdvisorDelegateVotingView } from "@/components/advisor/AdvisorDelegateVotingView";
import { requireAdvisorDelegateContext } from "@/lib/advisor-delegate-page";
import { ensureAgendaFloorVoteItem } from "@/lib/ensure-agenda-floor-vote-item";
import { getTranslations } from "next-intl/server";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdvisorDelegateVotingPage({ params }: PageProps) {
  const { userId } = await params;
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assignment = await requireAdvisorDelegateContext(supabase, user.id, userId);

  await ensureAgendaFloorVoteItem(supabase, assignment.conference_id);

  const { data: voteItems } = await supabase
    .from("vote_items")
    .select("*")
    .eq("conference_id", assignment.conference_id)
    .order("closed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: delegateVotes } = await supabase
    .from("votes")
    .select("vote_item_id, value")
    .eq("allocation_id", assignment.delegate_allocation_id);

  const voteByItemId = Object.fromEntries(
    (delegateVotes ?? []).map((row) => [row.vote_item_id, row.value])
  );

  return (
    <MunPageShell title={t("advisorDelegateVoting")}>
      <AdvisorDelegateVotingView
        voteItems={voteItems ?? []}
        voteByItemId={voteByItemId}
        delegateCountry={assignment.delegate_country}
      />
    </MunPageShell>
  );
}
