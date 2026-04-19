import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import type { AwardParticipationScore } from "@/types/database";
import type { ChairSeat } from "@/lib/award-participation-scoring";
import { DelegateChairFeedbackPanel } from "@/components/delegate/DelegateChairFeedbackPanel";

export const dynamic = "force-dynamic";

export default async function DelegateChairFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "delegate") redirect("/profile");

  const conferenceId = await requireActiveConferenceId();

  const { data: alloc } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", conferenceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!alloc) {
    redirect("/delegate");
  }

  const { data: conf } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("id", conferenceId)
    .maybeSingle();
  const committeeLabel = conf?.committee?.trim() || conf?.name?.trim() || conf?.id?.slice(0, 8) || "Committee";

  const { data: allocData } = await supabase
    .from("allocations")
    .select("conference_id, user_id, profiles(role, name)")
    .eq("conference_id", conferenceId)
    .not("user_id", "is", null);

  const seats: ChairSeat[] = [];
  for (const a of allocData ?? []) {
    const uid = a.user_id as string;
    const prof = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    const r = prof?.role?.toString().trim().toLowerCase();
    if (r !== "chair") continue;
    const name = prof?.name?.trim() || uid.slice(0, 8);
    seats.push({
      committee_conference_id: a.conference_id as string,
      chair_profile_id: uid,
      committeeLabel,
      chairName: name,
    });
  }

  const { data: myScores } = await supabase
    .from("award_participation_scores")
    .select("*")
    .eq("committee_conference_id", conferenceId)
    .eq("scope", "chair_by_delegate")
    .eq("created_by", user.id);

  return (
    <MunPageShell title="Chair feedback">
      <DelegateChairFeedbackPanel chairSeats={seats} myScores={(myScores ?? []) as AwardParticipationScore[]} />
    </MunPageShell>
  );
}
