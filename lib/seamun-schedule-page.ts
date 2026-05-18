import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { seamunDefaultGroupForCommittee } from "@/lib/seamun-i-2027-advisor-schedules";
import { isSeamunI2027LockedScheduleEvent } from "@/lib/seamun-i-2027-locked-schedule";
import { SEAMUN_I_2027_EVENT_CODE } from "@/lib/seamun-i-2027-secretariat-roster";
import type { SeamunScheduleGroupId } from "@/lib/seamun-i-2027-committee-groups";

export type SeamunSchedulePageContext = {
  initialCommittee: string | null;
  initialGroupId: SeamunScheduleGroupId | null;
};

export async function loadSeamunSchedulePageContext(
  supabase: SupabaseClient
): Promise<SeamunSchedulePageContext | null> {
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

  if (!isSeamun) return null;

  const initialCommittee = conf?.committee?.trim() || null;
  const initialGroupId = seamunDefaultGroupForCommittee(initialCommittee);

  return { initialCommittee, initialGroupId };
}
