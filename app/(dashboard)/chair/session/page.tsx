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
  const { data: ps, error } = await supabase
    .from("procedure_states")
    .select("committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at")
    .eq("conference_id", data.conferenceId)
    .maybeSingle();

  const errorMessage = String(error?.message ?? "");
  const missingSessionColumns =
    /schema cache/i.test(errorMessage) &&
    /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at/i.test(errorMessage);
  const fallback = missingSessionColumns
    ? await supabase
        .from("procedure_states")
        .select("id")
        .eq("conference_id", data.conferenceId)
        .maybeSingle()
    : null;

  const row = (missingSessionColumns ? fallback?.data : ps) as {
    committee_session_started_at?: string | null;
    committee_session_duration_seconds?: number | null;
    committee_session_ends_at?: string | null;
  } | null;
  const initialStartedAt = row?.committee_session_started_at ?? null;
  const initialDurationSeconds = row?.committee_session_duration_seconds ?? null;
  const initialEndsAt = row?.committee_session_ends_at ?? null;

  return (
    <MunPageShell title="Committee session">
      <SessionFloorOverview
        conferenceId={data.conferenceId}
        conferenceTitle={data.conferenceTitle}
        initialCommitteeSessionStartedAt={initialStartedAt}
        initialCommitteeSessionDurationSeconds={initialDurationSeconds}
        initialCommitteeSessionEndsAt={initialEndsAt}
      />
    </MunPageShell>
  );
}
