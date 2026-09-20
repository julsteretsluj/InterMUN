import { MunPageShell } from "@/components/MunPageShell";
import { ChairSessionControlLoader } from "@/components/chair/ChairSessionControlLoader";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";
import { getTranslations } from "next-intl/server";

export default async function ChairSessionOpeningSpeechPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title={t("openingSpeech")} variant="split">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title={t("openingSpeech")} variant="flush">
      <ChairSessionControlLoader {...data} activeSection="opening-speech" />
    </MunPageShell>
  );
}
