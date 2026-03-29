import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";

export default async function ChairSessionMotionsPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title="Formal motions">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title="Formal motions">
      <SessionControlClient {...data} activeSection="motions" />
    </MunPageShell>
  );
}
