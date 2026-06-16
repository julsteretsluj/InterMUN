import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { SeamunI2027LockedScheduleVisual } from "@/components/smt/SeamunI2027LockedScheduleVisual";
import { loadAdvisorSeamunSchedulePageContext } from "@/lib/seamun-schedule-page";
import { isAdvisorRole } from "@/lib/roles";
import { getTranslations } from "next-intl/server";

export default async function AdvisorSchedulePage() {
  const t = await getTranslations("pageTitles");
  const ta = await getTranslations("advisorDashboard.schedule");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isAdvisorRole(profile?.role)) redirect("/advisor");

  const ctx = await loadAdvisorSeamunSchedulePageContext(supabase);
  if (!ctx) redirect("/advisor");

  return (
    <MunPageShell title={t("advisorSchedule")}>
      <p className="mb-4 max-w-2xl text-sm text-brand-muted">{ta("intro")}</p>
      <SeamunI2027LockedScheduleVisual variant="advisor" defaultView="detail" />
    </MunPageShell>
  );
}
