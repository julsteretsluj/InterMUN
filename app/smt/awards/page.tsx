import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import type { AwardAssignment, AwardParticipationScore } from "@/types/database";
import { isConferenceEventPlaceholderRow, submittedResolutionLabel } from "@/lib/awards";
import { isRetiredSeamunCommitteeRow } from "@/lib/retired-seamun-committees";
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
import type { SmtForwardedResolutionRow } from "./SmtForwardedResolutionsPanel";
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
    supabase
      .from("conferences")
      .select("id, name, committee, committee_code, event_id")
      .order("created_at", { ascending: false }),
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

  const nominationRowsForQueue = filterNominationsForSmtQueue(
    nominationRows.filter((n) => n.nomination_type !== "conference_best_delegate"),
    selectedSingleWinnerGroupKeys
  );

  const overallBestDelegateLadderRows = nominationRows.filter(
    (n) => n.nomination_type === "conference_best_delegate"
  );

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
  type RecipientOpt = { id: string; name: string | null };
  /** Award-recipient options scoped to who is actually seated. */
  let recipientDelegatesByCommittee: Record<string, RecipientOpt[]> = {};
  let recipientConferenceDelegates: RecipientOpt[] = [];
  let recipientConferenceChairs: RecipientOpt[] = [];
  let conferenceIdToCanonicalPayload: Record<string, string> = {};
  let smtCommittees: CommitteeOpt[] = [];
  let smtChairSeats: ChairSeat[] = [];
  let smtParticipationRows: AwardParticipationScore[] = [];
  let delegateChairFeedback: ReturnType<typeof aggregateDelegateChairFeedbackBySeat> = [];
  let smtChairRanking: { seat: ChairSeat; total: number }[] = [];
  let smtReportRanking: { committee: CommitteeOpt; total: number }[] = [];
  let smtReadiness = { ok: true as boolean, missingChairs: [] as string[], missingReports: [] as string[] };
  let bestDelegateComparisonRows: BestDelegateComparisonRow[] = [];
  let forwardedResolutionRows: SmtForwardedResolutionRow[] = [];

  if (eventId) {
    const rawConfs = (conferences ?? []).filter(
      (c) =>
        c.event_id === eventId &&
        !isConferenceEventPlaceholderRow(c) &&
        !isRetiredSeamunCommitteeRow(c)
    );
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
      const delegatesByCanonId: Record<string, Map<string, RecipientOpt>> = {};
      const eventDelegateMap = new Map<string, RecipientOpt>();
      const eventChairMap = new Map<string, RecipientOpt>();
      for (const a of allocData ?? []) {
        const uid = a.user_id as string;
        const prof = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        const role = prof?.role?.toString().trim().toLowerCase();
        const displayName = prof?.name?.trim() || null;
        const canonId = conferenceIdToCanonical.get(a.conference_id as string) ?? (a.conference_id as string);

        if (role === "delegate") {
          const perCommittee = delegatesByCanonId[canonId] ?? (delegatesByCanonId[canonId] = new Map());
          if (!perCommittee.has(uid)) perCommittee.set(uid, { id: uid, name: displayName });
          if (!eventDelegateMap.has(uid)) eventDelegateMap.set(uid, { id: uid, name: displayName });
        } else if (role === "chair") {
          if (!eventChairMap.has(uid)) eventChairMap.set(uid, { id: uid, name: displayName });
        }

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

      const byName = (a: RecipientOpt, b: RecipientOpt) =>
        (a.name?.trim() || "").localeCompare(b.name?.trim() || "") || a.id.localeCompare(b.id);
      recipientDelegatesByCommittee = Object.fromEntries(
        Object.entries(delegatesByCanonId).map(([id, m]) => [id, [...m.values()].sort(byName)])
      );
      recipientConferenceDelegates = [...eventDelegateMap.values()].sort(byName);
      recipientConferenceChairs = [...eventChairMap.values()].sort(byName);

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

    const eventConfIds = rawConfs.map((c) => c.id);
    if (eventConfIds.length > 0) {
      type SubmittedResolutionRow = {
        id: string;
        conference_id: string;
        google_docs_url: string | null;
        main_submitters: string[] | null;
        status: string | null;
        finalized_at: string | null;
        forwarded_to_smt_at?: string | null;
      };

      const submittedSelect =
        "id, conference_id, google_docs_url, main_submitters, status, forwarded_to_smt_at, finalized_at";
      const submittedQuery = await supabase
        .from("resolutions")
        .select(submittedSelect)
        .in("conference_id", eventConfIds);
      let submittedRows: SubmittedResolutionRow[] = (submittedQuery.data ?? []) as SubmittedResolutionRow[];
      if (
        submittedQuery.error &&
        /forwarded_to_smt_at|schema cache/i.test(String(submittedQuery.error.message ?? ""))
      ) {
        const fallbackQuery = await supabase
          .from("resolutions")
          .select("id, conference_id, google_docs_url, main_submitters, status, finalized_at")
          .in("conference_id", eventConfIds);
        submittedRows = (fallbackQuery.data ?? []) as SubmittedResolutionRow[];
      }
      submittedRows = submittedRows.filter((r) => {
        const forwardedAt = r.forwarded_to_smt_at ?? null;
        return (r.status ?? "draft") === "finalized" || Boolean(forwardedAt);
      });
      if (submittedRows.length > 0) {
        const submittedIds = submittedRows.map((r) => r.id);
        const [{ data: blocRows }, { data: clauseRows }] = await Promise.all([
          supabase.from("blocs").select("resolution_id, name").in("resolution_id", submittedIds),
          supabase.from("resolution_clauses").select("id, resolution_id").in("resolution_id", submittedIds),
        ]);
        const blocNameByRes = new Map<string, string>();
        for (const b of blocRows ?? []) {
          if (b.resolution_id && b.name?.trim()) blocNameByRes.set(b.resolution_id, b.name.trim());
        }
        const clauseCountByRes = new Map<string, number>();
        for (const c of clauseRows ?? []) {
          clauseCountByRes.set(c.resolution_id, (clauseCountByRes.get(c.resolution_id) ?? 0) + 1);
        }
        const selectedCommittee = new Set(
          ((assignments ?? []) as AwardAssignment[])
            .filter((a) => a.category === "committee_best_resolution" && a.resolution_id)
            .map((a) => a.resolution_id as string)
        );
        const selectedConference = new Set(
          ((assignments ?? []) as AwardAssignment[])
            .filter((a) => a.category === "conference_best_resolution" && a.resolution_id)
            .map((a) => a.resolution_id as string)
        );
        forwardedResolutionRows = submittedRows.map((r) => {
          const mains = (r.main_submitters ?? []).filter(Boolean);
          const committeeLabel =
            labelByConf[r.conference_id] ??
            committeeLabelByConferenceId[r.conference_id] ??
            r.conference_id.slice(0, 8);
          const blocName = blocNameByRes.get(r.id) ?? "Resolution";
          const forwardedAt =
            "forwarded_to_smt_at" in r
              ? ((r as { forwarded_to_smt_at?: string | null }).forwarded_to_smt_at ?? null)
              : null;
          return {
            id: r.id,
            conferenceId: r.conference_id,
            committeeLabel,
            blocName,
            displayLabel: submittedResolutionLabel(blocName, committeeLabel),
            googleDocsUrl: r.google_docs_url,
            clauseCount: clauseCountByRes.get(r.id) ?? 0,
            mainSubmitterNames: mains.map((id) => nomineeNameByProfileId[id] ?? id.slice(0, 8)),
            firstMainSubmitterId: mains[0] ?? null,
            forwardedAt,
            selectedAsCommittee: selectedCommittee.has(r.id),
            selectedAsConference: selectedConference.has(r.id),
          };
        });
      }
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
    <MunPageShell
      variant="split"
      title={t("awardsSmt")}
      titleAside={<PageFeatureGuideLink featureId="awards" role="smt" />}
    >
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
        eligibleRecipients={{
          delegatesByCommittee: recipientDelegatesByCommittee,
          conferenceDelegates: recipientConferenceDelegates,
          conferenceChairs: recipientConferenceChairs,
        }}
        bestDelegateComparisonRows={bestDelegateComparisonRows}
        overallBestDelegateLadderRows={overallBestDelegateLadderRows}
        forwardedResolutionRows={forwardedResolutionRows}
      />
    </MunPageShell>
  );
}
