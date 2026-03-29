import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";

export default async function ChairSessionRollCallPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title="✅ Roll Call Tracker">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title="✅ Roll Call Tracker">
      <SessionControlClient {...data} activeSection="roll-call" />
    </MunPageShell>
  );
}
