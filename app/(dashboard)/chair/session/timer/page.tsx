import { MunPageShell } from "@/components/MunPageShell";
import { ChairSessionControlLoader } from "@/components/chair/ChairSessionControlLoader";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";
import { getTranslations } from "next-intl/server";

export default async function ChairSessionTimerPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title={t("timer")} variant="default">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title={t("timer")} variant="offset">
      <ChairSessionControlLoader {...data} activeSection="timer" />
    </MunPageShell>
  );
}
