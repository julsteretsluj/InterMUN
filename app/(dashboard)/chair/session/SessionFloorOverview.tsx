import { ChairCommitteeSessionControl } from "@/components/chair/ChairCommitteeSessionControl";

export function SessionFloorOverview({
  conferenceId,
  conferenceTitle,
  initialCommitteeSessionStartedAt,
}: {
  conferenceId: string;
  conferenceTitle: string;
  initialCommitteeSessionStartedAt: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      <ChairCommitteeSessionControl
        conferenceId={conferenceId}
        initialStartedAt={initialCommitteeSessionStartedAt}
      />
    </div>
  );
}
