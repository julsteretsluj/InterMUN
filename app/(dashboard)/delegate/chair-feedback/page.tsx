import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import type { AwardParticipationScore } from "@/types/database";
import type { ChairSeat } from "@/lib/award-participation-scoring";
import { DelegateChairFeedbackPanel } from "@/components/delegate/DelegateChairFeedbackPanel";
import { uniqueSuggestionStrings } from "@/lib/delegate-chair-feedback-suggestions";

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

  const [{ data: myScores }, { data: priorEvidenceRows }, { data: delegatePoints }, { data: myMotions }] =
    await Promise.all([
      supabase
        .from("award_participation_scores")
        .select("*")
        .eq("committee_conference_id", conferenceId)
        .eq("scope", "chair_by_delegate")
        .eq("created_by", user.id),
      supabase
        .from("award_participation_scores")
        .select("evidence_statement")
        .eq("scope", "chair_by_delegate")
        .eq("created_by", user.id)
        .not("evidence_statement", "is", null)
        .order("updated_at", { ascending: false })
        .limit(25),
      supabase
        .from("chair_delegate_points")
        .select("point_text")
        .eq("allocation_id", alloc.id)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("vote_items")
        .select("title, description")
        .eq("motioner_allocation_id", alloc.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const motionSnippets = (myMotions ?? [])
    .map((m) => [m.title, m.description].filter(Boolean).join(" — ").trim())
    .filter(Boolean);

  const evidenceSuggestions = uniqueSuggestionStrings(
    [
      ...(priorEvidenceRows ?? []).map((r) => r.evidence_statement).filter(Boolean) as string[],
      ...(delegatePoints ?? []).map((p) => p.point_text).filter(Boolean),
      ...motionSnippets,
    ],
    12
  );

  return (
    <MunPageShell title="Chair feedback">
      <DelegateChairFeedbackPanel
        chairSeats={seats}
        myScores={(myScores ?? []) as AwardParticipationScore[]}
        evidenceSuggestions={evidenceSuggestions}
      />
    </MunPageShell>
  );
}
