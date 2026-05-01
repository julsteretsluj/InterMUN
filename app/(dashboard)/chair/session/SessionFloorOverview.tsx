import { ChairCommitteeSessionControl } from "@/components/chair/ChairCommitteeSessionControl";
import { getTranslations } from "next-intl/server";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";

export default async function SessionFloorOverview({
  conferenceId,
  conferenceTitle,
  canonicalConferenceId,
  initialCommitteeSessionStartedAt,
  initialCommitteeSessionDurationSeconds,
  initialCommitteeSessionEndsAt,
  initialCommitteeSessionTitle,
}: {
  conferenceId: string;
  conferenceTitle: string;
  /** Committee-wide session timer + history (canonical `conferences.id`). */
  canonicalConferenceId: string;
  initialCommitteeSessionStartedAt: string | null;
  initialCommitteeSessionDurationSeconds: number | null;
  initialCommitteeSessionEndsAt: string | null;
  initialCommitteeSessionTitle: string | null;
}) {
  const tTopics = await getTranslations("agendaTopics");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const displayTitle = translateConferenceHeadline(tTopics, tCommitteeLabels, conferenceTitle);

  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">{displayTitle}</p>
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
