import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import type { AwardAssignment } from "@/types/database";
import { isSmtRole } from "@/lib/roles";
import type { NominationRubricType } from "@/lib/seamuns-award-scoring";
import {
  filterNominationsForSmtQueue,
  nominationGroupKey,
  SINGLE_WINNER_NOMINATION_TYPES,
} from "@/lib/award-nomination-review";
import type { ChairNominationRow } from "./ChairNominationsPanel";
import { SmtAwardsRefreshOnFocus } from "./SmtAwardsRefreshOnFocus";
import { SmtAwardsTabs } from "./SmtAwardsTabs";

export const dynamic = "force-dynamic";

export default async function SmtAwardsPage() {
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

  if (!isSmtRole(profile?.role)) {
    redirect("/profile");
  }

  const [
    { data: conferences },
    { data: assignments },
    { data: profiles },
    { data: nominations, error: nominationsError },
    { data: selectedSingleWinners },
  ] = await Promise.all([
    supabase.from("conferences").select("id, name, committee").order("created_at", { ascending: false }),
    supabase.from("award_assignments").select("*").order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, name").order("name"),
    supabase
      .from("award_nominations")
      .select(
        "id, nomination_type, rank, status, evidence_note, rubric_scores, committee_conference_id, nominee_profile_id"
      )
      .eq("status", "pending")
      .order("committee_conference_id", { ascending: true })
      .order("nomination_type", { ascending: true })
      .order("rank", { ascending: true }),
    supabase
      .from("award_nominations")
      .select("committee_conference_id, nomination_type")
      .eq("status", "selected")
      .in("nomination_type", [...SINGLE_WINNER_NOMINATION_TYPES]),
  ]);

  type NominationRow = {
    id: string;
    nomination_type: NominationRubricType;
    rank: number;
    status: string;
    evidence_note: string | null;
    rubric_scores: Record<string, number> | null;
    committee_conference_id: string;
    nominee_profile_id: string;
  };
  const nominationRows = (nominations ?? []) as NominationRow[];

  const selectedSingleWinnerGroupKeys = new Set(
    (selectedSingleWinners ?? []).map((r) => nominationGroupKey(r.committee_conference_id, r.nomination_type))
  );

  const nominationRowsForQueue = filterNominationsForSmtQueue(nominationRows, selectedSingleWinnerGroupKeys);

  /** Awards are scoped to the MUN committee (DISEC, UNSC, …), not the topic/agenda title. */
  const committeeLabelByConferenceId: Record<string, string> = Object.fromEntries(
    (conferences ?? []).map((c) => {
      const label = c.committee?.trim() || c.name?.trim() || c.id.slice(0, 8);
      return [c.id, label];
    })
  );

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.name?.trim() || p.id.slice(0, 8)]));
  const nomineeNameByProfileId: Record<string, string> = Object.fromEntries(profileById);

  const nominationsPayload: ChairNominationRow[] = nominationRowsForQueue.map((n) => ({
    id: n.id,
    nomination_type: n.nomination_type,
    rank: n.rank,
    status: n.status,
    evidence_note: n.evidence_note,
    rubric_scores: n.rubric_scores,
    committee_conference_id: n.committee_conference_id,
    nominee_profile_id: n.nominee_profile_id,
  }));

  return (
    <MunPageShell title="Awards">
      <SmtAwardsRefreshOnFocus />
      {nominationsError ? (
        <div
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          Could not load chair nominations ({nominationsError.message}). If you recently changed database policies,
          apply pending Supabase migrations (including{" "}
          <code className="rounded bg-rose-100 px-1 dark:bg-rose-900/60">00092_profiles_restore_staff_select</code>
          ).
        </div>
      ) : null}
      <SmtAwardsTabs
        nominations={nominationsPayload}
        committeeLabelByConferenceId={committeeLabelByConferenceId}
        nomineeNameByProfileId={nomineeNameByProfileId}
        conferences={conferences ?? []}
        assignments={(assignments ?? []) as AwardAssignment[]}
        profiles={profiles ?? []}
      />
    </MunPageShell>
  );
}
