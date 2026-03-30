import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";

export default async function ChairSessionSpeakersPage() {
  const data = await loadChairSessionConference();
  if (!data) {
    return (
    <MunPageShell title="🎤 Speakers">
      <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title="🎤 Speakers">
      <SessionControlClient {...data} activeSection="speakers" />
    </MunPageShell>
  );
}
