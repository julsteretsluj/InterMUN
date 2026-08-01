import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { loadChairSessionConference } from "./loadChairSession";
import { SessionFloorNoCommittee } from "./SessionFloorNoCommittee";
import SessionFloorOverview from "./SessionFloorOverview";
import { getTranslations } from "next-intl/server";
import { isSeamunI2027LockedScheduleEvent } from "@/lib/seamun-i-2027-locked-schedule";
import {
  buildSeamunPresetSessionsForCommittee,
  buildSeamunScheduleMilestonesForCommittee,
  type SeamunPresetSession,
  type SeamunScheduleMilestone,
} from "@/lib/seamun-preset-sessions";

export default async function ChairSessionPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell
        variant="flush"
        title={t("committeeSession")}
        titleAside={<PageFeatureGuideLink featureId="session" role="chair" />}
      >
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }

  const supabase = await createClient();
  const { data: ps, error } = await supabase
    .from("procedure_states")
    .select(
      "committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at, committee_session_title"
    )
    .eq("conference_id", data.canonicalConferenceId)
    .maybeSingle();

  const errorMessage = String(error?.message ?? "");
  const missingSessionColumns =
    /schema cache/i.test(errorMessage) &&
    /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at|committee_session_title/i.test(
      errorMessage
    );
  const fallback = missingSessionColumns
    ? await supabase
        .from("procedure_states")
        .select("id")
        .eq("conference_id", data.canonicalConferenceId)
        .maybeSingle()
    : null;

  const row = (missingSessionColumns ? fallback?.data : ps) as {
    committee_session_started_at?: string | null;
    committee_session_duration_seconds?: number | null;
    committee_session_ends_at?: string | null;
    committee_session_title?: string | null;
  } | null;
  const initialStartedAt = row?.committee_session_started_at ?? null;
  const initialDurationSeconds = row?.committee_session_duration_seconds ?? null;
  const initialEndsAt = row?.committee_session_ends_at ?? null;
  const initialSessionTitle = row?.committee_session_title ?? null;

  let presetSessions: SeamunPresetSession[] = [];
  let scheduleMilestones: SeamunScheduleMilestone[] = [];
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, event_id")
    .eq("id", data.conferenceId)
    .maybeSingle();
  if (conf?.event_id && conf.committee) {
    const { data: eventRow } = await supabase
      .from("conference_events")
      .select("id, event_code")
      .eq("id", conf.event_id)
      .maybeSingle();
    if (eventRow && isSeamunI2027LockedScheduleEvent(eventRow.id, eventRow.event_code)) {
      presetSessions = buildSeamunPresetSessionsForCommittee(conf.committee);
      scheduleMilestones = buildSeamunScheduleMilestonesForCommittee(conf.committee);
    }
  }

  return (
    <MunPageShell
      variant="default"
      title={t("committeeSession")}
      titleAside={<PageFeatureGuideLink featureId="session" role="chair" />}
    >
      <SessionFloorOverview
        conferenceId={data.conferenceId}
        conferenceTitle={data.conferenceTitle}
        canonicalConferenceId={data.canonicalConferenceId}
        initialCommitteeSessionStartedAt={initialStartedAt}
        initialCommitteeSessionDurationSeconds={initialDurationSeconds}
        initialCommitteeSessionEndsAt={initialEndsAt}
        initialCommitteeSessionTitle={initialSessionTitle}
        presetSessions={presetSessions}
        scheduleMilestones={scheduleMilestones}
      />
    </MunPageShell>
  );
}
