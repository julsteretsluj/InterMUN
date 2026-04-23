import { createClient } from "@/lib/supabase/server";
import { GuidesView } from "@/components/guides/GuidesView";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import type { GlossaryContext } from "@/lib/mun-glossary";

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

  const dashboardConference = await getConferenceForDashboard({ role: profile?.role });
  let glossaryContext: GlossaryContext | null = null;

  if (dashboardConference) {
    const debateBundle = await getResolvedDebateConferenceBundle(supabase, dashboardConference.id);
    const { data: siblingRows } = await supabase
      .from("conferences")
      .select("id, name")
      .in("id", debateBundle.siblingConferenceIds)
      .order("created_at", { ascending: true });

    glossaryContext = {
      committeeCode: dashboardConference.committee_code,
      committeeLabel: dashboardConference.committee,
      topicLabels: (siblingRows ?? [])
        .map((r) => r.name?.trim())
        .filter((v): v is string => Boolean(v)),
    };
  }

  const { data: guides } = await supabase
    .from("guides")
    .select("*")
    .order("slug");

  return (
    <MunPageShell title={t("guides")}>
      <GuidesView guides={guides || []} canEdit={canEdit} glossaryContext={glossaryContext} />
    </MunPageShell>
  );
}
