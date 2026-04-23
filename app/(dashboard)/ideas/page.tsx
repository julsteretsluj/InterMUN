import { createClient } from "@/lib/supabase/server";
import { IdeasView } from "@/components/ideas/IdeasView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getTranslations } from "next-intl/server";

export default async function IdeasPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const conferenceId = await requireActiveConferenceId();

  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", user.id)
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title={t("ideas")}>
      <IdeasView ideas={ideas || []} conferenceId={conferenceId} />
    </MunPageShell>
  );
}
