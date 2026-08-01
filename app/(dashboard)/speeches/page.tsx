import { createClient } from "@/lib/supabase/server";
import { SpeechesView } from "@/components/speeches/SpeechesView";
import { MunPageShell } from "@/components/MunPageShell";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { parseSpeechOutlinePoints } from "@/lib/speech-outline";
import { getTranslations } from "next-intl/server";

export default async function SpeechesPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: speeches }, { data: profile }] = await Promise.all([
    supabase
      .from("speeches")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("role, speech_outline_points")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <MunPageShell
      variant="offset"
      title={t("speeches")}
      titleAside={<PageFeatureGuideLink featureId="speeches" role={profile?.role} />}
    >
      <SpeechesView
        speeches={speeches || []}
        speechOutlinePoints={parseSpeechOutlinePoints(profile?.speech_outline_points)}
      />
    </MunPageShell>
  );
}
