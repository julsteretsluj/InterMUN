import { createClient } from "@/lib/supabase/server";
import { SourcesView } from "@/components/sources/SourcesView";
import { MunPageShell } from "@/components/MunPageShell";
import { getTranslations } from "next-intl/server";

export default async function SourcesPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canEditAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  let sourcesQuery = supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (!canEditAll) {
    sourcesQuery = sourcesQuery.eq("user_id", user.id);
  }

  const { data: sources } = await sourcesQuery;

  return (
    <MunPageShell title={t("sources")}>
      <SourcesView
        sources={sources || []}
        currentUserId={user.id}
        canEditAll={canEditAll}
      />
    </MunPageShell>
  );
}
