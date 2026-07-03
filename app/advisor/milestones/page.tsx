import { MunPageShell } from "@/components/MunPageShell";
import { MilestonesView } from "@/components/milestones/MilestonesView";
import { loadMilestonesForViewer } from "@/lib/milestones-data";
import { getTranslations } from "next-intl/server";

export default async function AdvisorMilestonesPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadMilestonesForViewer();
  return (
    <MunPageShell title={t("milestones")}>
      <MilestonesView data={data} />
    </MunPageShell>
  );
}
