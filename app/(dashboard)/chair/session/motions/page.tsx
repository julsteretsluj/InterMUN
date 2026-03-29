import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";

export default async function ChairSessionMotionsPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title="Session floor">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title="Session floor">
      <SessionControlClient {...data} activeSection="motions" />
    </MunPageShell>
  );
}
