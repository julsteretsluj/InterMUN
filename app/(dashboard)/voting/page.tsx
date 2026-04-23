import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function VotingPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();

  const conferenceId = await requireActiveConferenceId();

  const { data: voteItems } = await supabase
    .from("vote_items")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("closed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <MunPageShell title={t("voting")}>
      <VotingPanel voteItems={voteItems || []} myRole={myRole} />
    </MunPageShell>
  );
}

