import { MunPageShell } from "@/components/MunPageShell";
import { ChairSessionControlLoader } from "@/components/chair/ChairSessionControlLoader";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";
import { getTranslations } from "next-intl/server";

export default async function ChairSessionSpeechNotesPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title={t("speechNotes")} variant="default">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title={t("speechNotes")} variant="offset">
      <ChairSessionControlLoader
        {...data}
        activeSection="timer"
        initialTimerWorkflowTab="notes"
      />
    </MunPageShell>
  );
}
