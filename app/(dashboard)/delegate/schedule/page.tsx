import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { SeamunI2027LockedScheduleVisual } from "@/components/smt/SeamunI2027LockedScheduleVisual";
import { loadSeamunSchedulePageContext } from "@/lib/seamun-schedule-page";
import { getTranslations } from "next-intl/server";

export default async function DelegateSchedulePage() {
  const t = await getTranslations("pageTitles");
  const td = await getTranslations("delegateDashboard.schedule");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await loadSeamunSchedulePageContext(supabase);
  if (!ctx?.initialCommittee) redirect("/delegate");

  return (
    <MunPageShell title={t("delegateSchedule")} variant="offset">
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
