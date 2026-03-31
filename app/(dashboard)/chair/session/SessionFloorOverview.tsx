import { ChairCommitteeSessionControl } from "@/components/chair/ChairCommitteeSessionControl";

export function SessionFloorOverview({
  conferenceId,
  conferenceTitle,
  initialCommitteeSessionStartedAt,
  initialCommitteeSessionDurationSeconds,
  initialCommitteeSessionEndsAt,
}: {
  conferenceId: string;
  conferenceTitle: string;
  initialCommitteeSessionStartedAt: string | null;
  initialCommitteeSessionDurationSeconds: number | null;
  initialCommitteeSessionEndsAt: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      <ChairCommitteeSessionControl
        conferenceId={conferenceId}
        initialStartedAt={initialCommitteeSessionStartedAt}
        initialDurationSeconds={initialCommitteeSessionDurationSeconds}
        initialEndsAt={initialCommitteeSessionEndsAt}
      />
    </div>
  );
}
