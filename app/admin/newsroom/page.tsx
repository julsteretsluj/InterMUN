import { MunPageShell } from "@/components/MunPageShell";
import { NewsroomView } from "@/components/newsroom/NewsroomView";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { getTranslations } from "next-intl/server";

export default async function AdminNewsroomPage() {
  const t = await getTranslations("pageTitles");
  return (
    <MunPageShell
      variant="offset"
      title={t("newsroom")}
      titleAside={<PageFeatureGuideLink featureId="newsroom" role="admin" />}
    >
      <NewsroomView />
    </MunPageShell>
  );
}
