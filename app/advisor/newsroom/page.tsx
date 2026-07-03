import { MunPageShell } from "@/components/MunPageShell";
import { NewsroomView } from "@/components/newsroom/NewsroomView";
import { getTranslations } from "next-intl/server";

export default async function AdvisorNewsroomPage() {
  const t = await getTranslations("pageTitles");
  return (
    <MunPageShell title={t("newsroom")}>
      <NewsroomView />
    </MunPageShell>
  );
}
