import { createClient } from "@/lib/supabase/server";
import { SpeechesView } from "@/components/speeches/SpeechesView";
import { MunPageShell } from "@/components/MunPageShell";
import { getTranslations } from "next-intl/server";

export default async function SpeechesPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: speeches } = await supabase
    .from("speeches")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <MunPageShell title={t("speeches")}>
      <SpeechesView speeches={speeches || []} />
    </MunPageShell>
  );
}
