import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { SeamunI2027LockedScheduleVisual } from "@/components/smt/SeamunI2027LockedScheduleVisual";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { seamunDefaultGroupForCommittee } from "@/lib/seamun-i-2027-advisor-schedules";
import { isSeamunI2027LockedScheduleEvent } from "@/lib/seamun-i-2027-locked-schedule";
import { SEAMUN_I_2027_EVENT_CODE } from "@/lib/seamun-i-2027-secretariat-roster";
import { getTranslations } from "next-intl/server";

export default async function DelegateSchedulePage() {
  const t = await getTranslations("pageTitles");
  const td = await getTranslations("delegateDashboard.schedule");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conferenceId = await requireActiveConferenceId();
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, event_id")
    .eq("id", conferenceId)
    .maybeSingle();

  const { data: eventRow } = conf?.event_id
    ? await supabase.from("conference_events").select("id, event_code").eq("id", conf.event_id).maybeSingle()
    : { data: null as { id: string; event_code: string } | null };

  const isSeamun =
    isSeamunI2027LockedScheduleEvent(eventRow?.id ?? "", eventRow?.event_code) ||
    (eventRow?.event_code ?? "").trim().toUpperCase() === SEAMUN_I_2027_EVENT_CODE;

  if (!isSeamun) {
    redirect("/delegate");
  }

  const initialCommittee = conf?.committee?.trim() || null;
  const initialGroupId = seamunDefaultGroupForCommittee(initialCommittee);

  return (
    <MunPageShell title={t("delegateSchedule")}>
      <p className="mb-4 max-w-2xl text-sm text-brand-muted">{td("intro")}</p>
      <SeamunI2027LockedScheduleVisual
        initialGroupId={initialGroupId}
        initialCommittee={initialCommittee}
        defaultView="detail"
      />
    </MunPageShell>
  );
}
