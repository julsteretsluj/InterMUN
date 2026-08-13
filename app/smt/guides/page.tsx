import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isSmtRole, isAdminRole } from "@/lib/roles";

export default async function SmtGuidesPage() {
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

  if (!isSmtRole(profile?.role)) redirect("/smt");

  const myRole = (profile?.role || "smt").toString().toLowerCase();
  const canEdit = myRole === "smt" || isAdminRole(myRole);

  const { data: guides } = await supabase.from("guides").select("*").order("slug");

  return (
    <MunPageShell title={t("guides")} variant="offset">
      <GuidesView
        guides={guides || []}
        canEdit={canEdit}
        role="smt"
      />
    </MunPageShell>
  );
}
