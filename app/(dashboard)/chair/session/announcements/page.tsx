import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";

export default async function ChairSessionAnnouncementsPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title="Announcements">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title="Announcements">
      <SessionControlClient {...data} activeSection="announcements" />
    </MunPageShell>
  );
}
