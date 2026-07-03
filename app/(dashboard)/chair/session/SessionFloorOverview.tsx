import { ChairCommitteeSessionControl } from "@/components/chair/ChairCommitteeSessionControl";
import { ChairScheduledSessionsPanel } from "@/components/chair/ChairScheduledSessionsPanel";
import { getLocale, getTranslations } from "next-intl/server";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";
import type {
  SeamunPresetSession,
  SeamunScheduleMilestone,
} from "@/lib/seamun-preset-sessions";

export default async function SessionFloorOverview({
  conferenceId,
  conferenceTitle,
  canonicalConferenceId,
  initialCommitteeSessionStartedAt,
  initialCommitteeSessionDurationSeconds,
  initialCommitteeSessionEndsAt,
  initialCommitteeSessionTitle,
  presetSessions = [],
  scheduleMilestones = [],
}: {
  conferenceId: string;
  conferenceTitle: string;
  /** Committee-wide session timer + history (canonical `conferences.id`). */
  canonicalConferenceId: string;
  initialCommitteeSessionStartedAt: string | null;
  initialCommitteeSessionDurationSeconds: number | null;
  initialCommitteeSessionEndsAt: string | null;
  initialCommitteeSessionTitle: string | null;
  presetSessions?: SeamunPresetSession[];
  scheduleMilestones?: SeamunScheduleMilestone[];
}) {
  const tTopics = await getTranslations("agendaTopics");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const locale = await getLocale();
  const displayTitle = translateConferenceHeadline(tTopics, tCommitteeLabels, conferenceTitle, locale);

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-muted">{displayTitle}</p>
      {presetSessions.length > 0 || scheduleMilestones.length > 0 ? (
        <ChairScheduledSessionsPanel
          conferenceId={canonicalConferenceId}
          presets={presetSessions}
          milestones={scheduleMilestones}
        />
      ) : null}
      <ChairCommitteeSessionControl
        conferenceId={canonicalConferenceId}
        initialStartedAt={initialCommitteeSessionStartedAt}
        initialDurationSeconds={initialCommitteeSessionDurationSeconds}
        initialEndsAt={initialCommitteeSessionEndsAt}
        initialSessionTitle={initialCommitteeSessionTitle}
      />
    </div>
  );
}
