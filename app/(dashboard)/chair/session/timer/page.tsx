import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";

export default async function ChairSessionTimerPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title="Timer">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title="Timer">
      <SessionControlClient {...data} activeSection="timer" />
    </MunPageShell>
  );
}
