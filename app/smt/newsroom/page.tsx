import { MunPageShell } from "@/components/MunPageShell";
import { NewsroomView } from "@/components/newsroom/NewsroomView";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { getTranslations } from "next-intl/server";

export default async function SmtNewsroomPage() {
  const t = await getTranslations("pageTitles");
  return (
    <MunPageShell
      variant="default"
      title={t("newsroom")}
      titleAside={<PageFeatureGuideLink featureId="newsroom" role="smt" />}
    >
      <NewsroomView />
    </MunPageShell>
  );
}
