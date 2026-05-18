import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { SeamunI2027LockedScheduleVisual } from "@/components/smt/SeamunI2027LockedScheduleVisual";
import { loadSeamunSchedulePageContext } from "@/lib/seamun-schedule-page";
import { isChairRole } from "@/lib/roles";
import { getTranslations } from "next-intl/server";

export default async function ChairSchedulePage() {
  const t = await getTranslations("pageTitles");
  const td = await getTranslations("delegateDashboard.schedule");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isChairRole(profile?.role)) redirect("/chair");

  const ctx = await loadSeamunSchedulePageContext(supabase);
  if (!ctx?.initialCommittee) redirect("/chair");

  return (
    <MunPageShell title={t("chairSchedule")}>
      <p className="mb-4 max-w-2xl text-sm text-brand-muted">{td("intro")}</p>
      <SeamunI2027LockedScheduleVisual
        variant="committee"
        initialGroupId={ctx.initialGroupId}
        initialCommittee={ctx.initialCommittee}
        defaultView="detail"
      />
    </MunPageShell>
  );
}
