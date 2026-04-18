import { ChairCommitteeSessionControl } from "@/components/chair/ChairCommitteeSessionControl";

export function SessionFloorOverview({
  conferenceId,
  conferenceTitle,
  canonicalConferenceId,
  initialCommitteeSessionStartedAt,
  initialCommitteeSessionDurationSeconds,
  initialCommitteeSessionEndsAt,
}: {
  conferenceId: string;
  conferenceTitle: string;
  /** Committee-wide session timer + history (canonical `conferences.id`). */
  canonicalConferenceId: string;
  initialCommitteeSessionStartedAt: string | null;
  initialCommitteeSessionDurationSeconds: number | null;
  initialCommitteeSessionEndsAt: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      <ChairCommitteeSessionControl
        conferenceId={canonicalConferenceId}
        initialStartedAt={initialCommitteeSessionStartedAt}
        initialDurationSeconds={initialCommitteeSessionDurationSeconds}
        initialEndsAt={initialCommitteeSessionEndsAt}
      />
    </div>
  );
}
