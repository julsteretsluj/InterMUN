import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function GuidesPage() {
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

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canEdit = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const { data: guides } = await supabase
    .from("guides")
    .select("*")
    .order("slug");

  return (
    <MunPageShell title={t("guides")}>
      <GuidesView guides={guides || []} canEdit={canEdit} />
    </MunPageShell>
  );
}
