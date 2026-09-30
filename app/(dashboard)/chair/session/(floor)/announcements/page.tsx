import { MunPageShell } from "@/components/MunPageShell";
import { ChairSessionControlLoader } from "@/components/chair/ChairSessionControlLoader";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";
import { getTranslations } from "next-intl/server";

export default async function ChairSessionAnnouncementsPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title={t("announcements")} variant="default">
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title={t("announcements")} variant="offset">
      <ChairSessionControlLoader {...data} activeSection="announcements" />
    </MunPageShell>
  );
}
