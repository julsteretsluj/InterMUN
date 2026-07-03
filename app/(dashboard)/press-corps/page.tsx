import { MunPageShell } from "@/components/MunPageShell";
import { PressCorpsView } from "@/components/press-corps/PressCorpsView";
import { getTranslations } from "next-intl/server";

export default async function PressCorpsPage() {
  const t = await getTranslations("pageTitles");
  return (
    <MunPageShell title={t("pressCorps")}>
      <PressCorpsView />
    </MunPageShell>
  );
}
