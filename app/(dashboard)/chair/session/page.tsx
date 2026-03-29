import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { loadChairSessionConference } from "./loadChairSession";
import { SessionFloorNoCommittee } from "./SessionFloorNoCommittee";
import { SessionFloorOverview } from "./SessionFloorOverview";

export default async function ChairSessionPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title="Committee session">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }

  const supabase = await createClient();
  const { data: ps } = await supabase
    .from("procedure_states")
    .select("committee_session_started_at")
    .eq("conference_id", data.conferenceId)
    .maybeSingle();

  const row = ps as { committee_session_started_at?: string | null } | null;
  const initialStartedAt = row?.committee_session_started_at ?? null;

  return (
    <MunPageShell title="Committee session">
      <SessionFloorOverview
        conferenceId={data.conferenceId}
        conferenceTitle={data.conferenceTitle}
        initialCommitteeSessionStartedAt={initialStartedAt}
      />
    </MunPageShell>
  );
}
