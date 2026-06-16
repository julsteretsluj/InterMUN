import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isAdvisorRole } from "@/lib/roles";
import { getActiveEventId } from "@/lib/active-event-cookie";
import type { GlossaryContext } from "@/lib/mun-glossary";

export default async function AdvisorGuidesPage() {
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

  if (!isAdvisorRole(profile?.role)) redirect("/advisor");

  const eventId = await getActiveEventId();
  let glossaryContext: GlossaryContext | null = null;

  if (eventId) {
    const { data: eventConfs } = await supabase
      .from("conferences")
      .select("id, name, committee, committee_code")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .limit(1);

    const conf = eventConfs?.[0];
    if (conf) {
      glossaryContext = {
        committeeCode: conf.committee_code,
        committeeLabel: conf.committee,
        topicLabels: conf.name?.trim() ? [conf.name.trim()] : [],
      };
    }
  }

  const { data: guides } = await supabase.from("guides").select("*").order("slug");

  return (
    <MunPageShell title={t("guides")}>
      <GuidesView guides={guides || []} canEdit={false} glossaryContext={glossaryContext} />
    </MunPageShell>
  );
}
