import { requireActiveConferenceId } from "@/lib/active-conference";
import { CommitteePersonView } from "@/components/committee-room/CommitteePersonView";

export default async function CommitteeRoomPersonPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const conferenceId = await requireActiveConferenceId();
  return (
    <CommitteePersonView
      conferenceId={conferenceId}
      personId={profileId}
      backHref="/committee-room"
      backLabel="Committee room"
    />
  );
}
