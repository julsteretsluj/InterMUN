import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { OfficialLinksPanel } from "@/components/OfficialLinksPanel";
import { getTranslations } from "next-intl/server";

export default async function OfficialLinksPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <MunPageShell title={t("officialUnLinks")}>
      <OfficialLinksPanel />
    </MunPageShell>
  );
}
