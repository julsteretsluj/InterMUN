import { MunPageShell } from "@/components/MunPageShell";
import { PressCorpsView } from "@/components/press-corps/PressCorpsView";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { getTranslations } from "next-intl/server";

export default async function PressCorpsPage() {
  const t = await getTranslations("pageTitles");
  return (
    <MunPageShell
      variant="offset"
      title={t("pressCorps")}
      titleAside={<PageFeatureGuideLink featureId="pressCorps" role="delegate" />}
    >
      <PressCorpsView />
    </MunPageShell>
  );
}
