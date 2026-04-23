import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import type { AwardAssignment, AwardParticipationScore } from "@/types/database";
import { isConferenceEventPlaceholderRow } from "@/lib/awards";
import { getActiveEventId } from "@/lib/active-event-cookie";
import {
  evaluateSmtParticipationReadiness,
  aggregateDelegateChairFeedbackBySeat,
  mergeChairReportScoresToCanonical,
  rubricKeysForParticipationScope,
  rubricNumericTotalForKeys,
  type ChairSeat,
} from "@/lib/award-participation-scoring";
import { isSmtRole } from "@/lib/roles";
import { canonicalCommitteesForEventConferenceRows } from "@/lib/conference-committee-canonical";
import type { NominationRubricType } from "@/lib/seamuns-award-scoring";
import {
  filterNominationsForSmtQueue,
  nominationGroupKey,
  SINGLE_WINNER_NOMINATION_TYPES,
} from "@/lib/award-nomination-review";
import type { ChairNominationRow } from "./ChairNominationsPanel";
import type { BestDelegateComparisonRow } from "./SmtBestDelegateComparison";
import { SmtAwardsRefreshOnFocus } from "./SmtAwardsRefreshOnFocus";
import { SmtAwardsTabs } from "./SmtAwardsTabs";
import { getTranslations } from "next-intl/server";
export const dynamic = "force-dynamic";

export default async function SmtAwardsPage() {
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

  if (!isSmtRole(profile?.role)) {
    redirect("/profile");
  }

  const eventId = await getActiveEventId();

  const [
    { data: conferences },
    { data: assignments },
    { data: profiles },
    { data: nominations, error: nominationsError },
    { data: selectedSingleWinners },
  ] = await Promise.all([
    supabase.from("conferences").select("id, name, committee, event_id").order("created_at", { ascending: false }),
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

  type CommitteeOpt = { id: string; label: string };
  let conferenceIdToCanonicalPayload: Record<string, string> = {};
  let smtCommittees: CommitteeOpt[] = [];
  let smtChairSeats: ChairSeat[] = [];
  let smtParticipationRows: AwardParticipationScore[] = [];
  let delegateChairFeedback: ReturnType<typeof aggregateDelegateChairFeedbackBySeat> = [];
  let smtChairRanking: { seat: ChairSeat; total: number }[] = [];
  let smtReportRanking: { committee: CommitteeOpt; total: number }[] = [];
  let smtReadiness = { ok: true as boolean, missingChairs: [] as string[], missingReports: [] as string[] };
  let bestDelegateComparisonRows: BestDelegateComparisonRow[] = [];

  if (eventId) {
    const rawConfs = (conferences ?? []).filter((c) => c.event_id === eventId && !isConferenceEventPlaceholderRow(c));
    const allConfIds = rawConfs.map((c) => c.id);
    const { data: allocForMap } = await supabase.from("allocations").select("conference_id").in("conference_id", allConfIds);
    const conferenceIdsWithAllocations = new Set(
      (allocForMap ?? []).map((a) => a.conference_id).filter(Boolean) as string[]
    );
    const { committees: canonicalCommittees, conferenceIdToCanonical } = canonicalCommitteesForEventConferenceRows(
      rawConfs,
      conferenceIdsWithAllocations
    );
    conferenceIdToCanonicalPayload = Object.fromEntries(conferenceIdToCanonical);
    smtCommittees = canonicalCommittees;
    const confIds = allConfIds;
    const canonicalLabelByCommitteeId = Object.fromEntries(canonicalCommittees.map((x) => [x.id, x.label]));
    const labelByConf = Object.fromEntries(
      rawConfs.map((c) => {
        const canonId = conferenceIdToCanonical.get(c.id) ?? c.id;
        const label =
          canonicalLabelByCommitteeId[canonId] ??
          c.committee?.trim() ??
          c.name?.trim() ??
          c.id.slice(0, 8);
        return [c.id, label];
      })
    );

    if (confIds.length > 0) {
      const { data: allocData } = await supabase
        .from("allocations")
        .select("conference_id, user_id, profiles(role, name)")
        .in("conference_id", confIds)
        .not("user_id", "is", null);

      const seats: ChairSeat[] = [];
      for (const a of allocData ?? []) {
        const uid = a.user_id as string;
        const prof = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        const role = prof?.role?.toString().trim().toLowerCase();
        if (role !== "chair") continue;
        const name = prof?.name?.trim() || uid.slice(0, 8);
        seats.push({
          committee_conference_id: a.conference_id as string,
          chair_profile_id: uid,
          committeeLabel: labelByConf[a.conference_id as string] ?? "?",
          chairName: name,
        });
      }
      smtChairSeats = seats;

      const { data: smtScores } = await supabase
        .from("award_participation_scores")
        .select("*")
        .in("committee_conference_id", confIds)
        .in("scope", ["chair_by_smt", "chair_report_by_smt", "chair_by_delegate"]);

      smtParticipationRows = mergeChairReportScoresToCanonical(
        (smtScores ?? []) as AwardParticipationScore[],
        conferenceIdToCanonical
      );

      const delegateFeedbackKeys = rubricKeysForParticipationScope("chair_by_delegate");
      delegateChairFeedback = aggregateDelegateChairFeedbackBySeat(smtChairSeats, smtParticipationRows, delegateFeedbackKeys);

      const chairKeys = rubricKeysForParticipationScope("chair_by_smt");
      const reportKeys = rubricKeysForParticipationScope("chair_report_by_smt");

      smtChairRanking = smtChairSeats
        .map((seat) => {
          const row = smtParticipationRows.find(
            (r) =>
              r.scope === "chair_by_smt" &&
              r.committee_conference_id === seat.committee_conference_id &&
              r.subject_profile_id === seat.chair_profile_id
          );
          return {
            seat,
            total: rubricNumericTotalForKeys(row?.rubric_scores ?? null, chairKeys),
          };
        })
        .sort((a, b) => b.total - a.total);

      smtReportRanking = smtCommittees
        .map((c) => {
          const row = smtParticipationRows.find(
            (r) =>
              r.scope === "chair_report_by_smt" &&
              r.committee_conference_id === c.id &&
              (r.subject_profile_id == null || r.subject_profile_id === "")
          );
          return {
            committee: c,
            total: rubricNumericTotalForKeys(row?.rubric_scores ?? null, reportKeys),
          };
        })
        .sort((a, b) => b.total - a.total);

      const smtReadinessRows = smtParticipationRows
        .filter((r) => r.scope === "chair_by_smt" || r.scope === "chair_report_by_smt")
        .map((r) => ({
          scope: r.scope as "chair_by_smt" | "chair_report_by_smt",
          committee_conference_id: r.committee_conference_id,
          subject_profile_id: r.subject_profile_id,
          rubric_scores: r.rubric_scores,
        }));
      smtReadiness = evaluateSmtParticipationReadiness(
        smtChairSeats,
        smtCommittees.map((c) => ({ id: c.id, committee: c.label, name: null })),
        smtReadinessRows
      );

      const { data: bdCompare } = await supabase
        .from("award_nominations")
        .select(
          "id, nomination_type, rank, status, evidence_note, rubric_scores, committee_conference_id, nominee_profile_id"
        )
        .in("committee_conference_id", confIds)
        .in("nomination_type", ["committee_best_delegate", "conference_best_delegate"])
        .in("status", ["draft", "pending"])
        .order("committee_conference_id", { ascending: true })
        .order("nomination_type", { ascending: true })
        .order("rank", { ascending: true });

      bestDelegateComparisonRows = (bdCompare ?? []) as BestDelegateComparisonRow[];
    }
  }

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
    <MunPageShell title={t("awardsSmt")}>
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
        participation={{
          committees: smtCommittees,
          chairSeats: smtChairSeats,
          scoreRows: smtParticipationRows,
          delegateChairFeedback,
          chairRanking: smtChairRanking,
          reportRanking: smtReportRanking,
          smtComplete: smtReadiness.ok,
          missingChairs: smtReadiness.missingChairs,
          missingReports: smtReadiness.missingReports,
        }}
        hasActiveEvent={Boolean(eventId)}
        conferenceIdToCanonical={conferenceIdToCanonicalPayload}
        bestDelegateComparisonRows={bestDelegateComparisonRows}
      />
    </MunPageShell>
  );
}
