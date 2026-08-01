import { MunPageShell } from "@/components/MunPageShell";
import { MilestonesView } from "@/components/milestones/MilestonesView";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { loadMilestonesForViewer } from "@/lib/milestones-data";
import { getTranslations } from "next-intl/server";

export default async function MilestonesPage() {
  const t = await getTranslations("pageTitles");
  const data = await loadMilestonesForViewer();
  return (
    <MunPageShell
      variant="flush"
      title={t("milestones")}
      titleAside={<PageFeatureGuideLink featureId="milestones" role={data.role} />}
    >
      <MilestonesView data={data} />
    </MunPageShell>
  );
}
