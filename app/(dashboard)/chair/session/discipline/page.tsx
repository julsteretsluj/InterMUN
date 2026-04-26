import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";
import { getTranslations } from "next-intl/server";

export default async function ChairSessionDisciplinePage() {
  const t = await getTranslations("chairMotionsPointsLog");
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title={t("disciplinarySystem")}>
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }
  return (
    <MunPageShell title={t("disciplinarySystem")}>
      <SessionControlClient {...data} activeSection="discipline" />
    </MunPageShell>
  );
}
