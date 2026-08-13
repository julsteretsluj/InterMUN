import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isAdminRole } from "@/lib/roles";

export default async function AdminGuidesPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminRole(profile?.role)) redirect("/admin");

  const { data: guides } = await supabase.from("guides").select("*").order("slug");

  return (
    <MunPageShell title={t("guides")} variant="split">
      <GuidesView
        guides={guides || []}
        canEdit
        role="admin"
      />
    </MunPageShell>
  );
}
