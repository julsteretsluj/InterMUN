import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import {
  criteriaForNominationType,
  type NominationRubricType,
  type RubricCriterion,
} from "@/lib/seamuns-award-scoring";
import { OverallAwardsProgress, SectionAwardsProgress } from "./AwardProgressBars";
import { ChairNominationSlotForm } from "./ChairNominationSlotForm";
import { ChairSubmitToSmtPanel } from "./ChairSubmitToSmtPanel";
import { runChairAwardAutoSubmitIfDue } from "@/app/actions/awards";
import { AWARD_SUBMISSION_DEADLINE_ISO } from "@/lib/award-submission";
import {
  dedupeAllocationsByUserId,
  getCommitteeAwardScope,
  mergeNominationRowsForCommitteeDisplay,
} from "@/lib/conference-committee-canonical";
import {
  evaluateDelegateMatrixReadiness,
  rubricKeysForParticipationScope,
  rubricNumericTotalForKeys,
} from "@/lib/award-participation-scoring";
import { DelegateMatrixPanel } from "./DelegateMatrixPanel";
import { ChairAwardsShell } from "@/components/chair/awards/ChairAwardsShell";
import { AwardsRubricReference } from "@/components/awards/AwardsRubricReference";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type DelegateRow = {
  id: string;
  user_id: string | null;
  country: string;
  profiles:
    | { name: string | null; role?: string | null }
    | { name: string | null; role?: string | null }[]
    | null;
};

function profileEmbed(row: DelegateRow) {
  const p = row.profiles;
  if (!p) return null;
  return Array.isArray(p) ? p[0] : p;
}

function isChairAllocation(row: DelegateRow): boolean {
  return profileEmbed(row)?.role === "chair";
}

function optionFromDelegateRow(d: DelegateRow): { userId: string; label: string } {
  const embed = profileEmbed(d);
  const name = embed?.name?.trim() || d.user_id!.slice(0, 8);
  return { userId: d.user_id!, label: `${d.country} — ${name}` };
}

/** Nominee picker: delegates & non-chair seats only; keep current selection if it is a chair (legacy row). */
function nomineeOptionsForSlot(
  delegateRowsNoChair: DelegateRow[],
  allRows: DelegateRow[],
  selectedNomineeId: string
): { userId: string; label: string }[] {
  const base = delegateRowsNoChair.filter((d) => d.user_id).map(optionFromDelegateRow);
  if (!selectedNomineeId || base.some((o) => o.userId === selectedNomineeId)) {
    return base;
  }
  const row = allRows.find((d) => d.user_id === selectedNomineeId);
  if (!row) return base;
  return [...base, optionFromDelegateRow(row)];
}

export default async function ChairAwardsPage() {
  const t = await getTranslations("pageTitles");
  const tPage = await getTranslations("chairAwardsPage");
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

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    redirect("/profile");
  }

  const activeConf = await getConferenceForDashboard({ role: profile?.role });
  if (!activeConf) {
    redirect("/room-gate?next=%2Fchair%2Fawards");
  }

  const awardScope = await getCommitteeAwardScope(supabase, activeConf.id);
  const awardConferenceId = awardScope.canonicalConferenceId;

  if (profile?.role === "chair") {
    const { data: chairSeat } = await supabase
      .from("allocations")
      .select("id")
      .in("conference_id", awardScope.siblingConferenceIds)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!chairSeat?.id) {
      redirect("/chair/allocation-matrix");
    }
    await runChairAwardAutoSubmitIfDue(awardConferenceId);
  }

  const [{ data: delegates }, { data: nominations }, { data: participationDelegate }] = await Promise.all([
    supabase
      .from("allocations")
      .select("id, user_id, country, profiles(name, role)")
      .in("conference_id", awardScope.siblingConferenceIds)
      .not("user_id", "is", null)
      .order("country", { ascending: true }),
    supabase
      .from("award_nominations")
      .select(
        "id, nomination_type, rank, evidence_note, rubric_scores, status, submitted_to_smt_at, nominee_profile_id, committee_conference_id, profiles(name)"
      )
      .in("committee_conference_id", awardScope.siblingConferenceIds)
      .in("status", ["draft", "pending"])
      .order("nomination_type", { ascending: true })
      .order("rank", { ascending: true }),
    supabase
      .from("award_participation_scores")
      .select("subject_profile_id, rubric_scores")
      .eq("committee_conference_id", awardConferenceId)
      .eq("scope", "delegate_by_chair"),
  ]);

  const delegateRowsAll = sortRowsByAllocationCountry(
    dedupeAllocationsByUserId((delegates ?? []) as DelegateRow[])
  );
  const delegateRows = delegateRowsAll.filter((d) => !isChairAllocation(d));

  const delegateByUserId: Record<string, { country: string; displayName: string }> = {};
  for (const d of delegateRowsAll) {
    if (!d.user_id) continue;
    const embed = profileEmbed(d);
    const name = embed?.name?.trim() || d.user_id.slice(0, 8);
    delegateByUserId[d.user_id] = { country: d.country, displayName: name };
  }

  const baseNomineeOptions = delegateRows.filter((d) => !!d.user_id).map(optionFromDelegateRow);
  const seatedDelegatesCount = baseNomineeOptions.length;

  const delegateProfileIdsForMatrix = delegateRows
    .filter((d) => d.user_id)
    .map((d) => d.user_id!) as string[];
  const matrixEval = evaluateDelegateMatrixReadiness(
    delegateProfileIdsForMatrix,
    (participationDelegate ?? []) as { subject_profile_id: string | null; rubric_scores: Record<string, number> | null }[]
  );
  const delegateMatrixComplete = matrixEval.ok;

  const matrixKeys = rubricKeysForParticipationScope("delegate_by_chair");
  const scoresByProfileId: Record<string, Record<string, number>> = {};
  for (const row of participationDelegate ?? []) {
    if (row.subject_profile_id && row.rubric_scores && typeof row.rubric_scores === "object") {
      scoresByProfileId[row.subject_profile_id] = row.rubric_scores as Record<string, number>;
    }
  }
  const delegateMatrixPayload = delegateProfileIdsForMatrix.map((uid) => ({
    userId: uid,
    country: delegateByUserId[uid]?.country ?? "?",
    displayName: delegateByUserId[uid]?.displayName ?? uid.slice(0, 8),
  }));
  const rankingDesc = [...delegateProfileIdsForMatrix]
    .map((uid) => ({
      uid,
      label: `${delegateByUserId[uid]?.country ?? "?"} — ${delegateByUserId[uid]?.displayName ?? uid.slice(0, 8)}`,
      total: rubricNumericTotalForKeys(scoresByProfileId[uid], matrixKeys),
    }))
    .sort((a, b) => b.total - a.total);
  /** Second HM is required only when there are more than 22 seated delegates. */
  const hmRequiresTwo = seatedDelegatesCount > 22;

  type NomRow = {
    id: string;
    nomination_type: NominationRubricType;
    rank: number;
    evidence_note: string | null;
    rubric_scores: Record<string, number> | null;
    status: string;
    submitted_to_smt_at: string | null;
    nominee_profile_id: string;
    committee_conference_id: string;
    profiles: { name: string | null } | { name: string | null }[] | null;
  };
  const nominationRows = mergeNominationRowsForCommitteeDisplay(
    (nominations ?? []) as NomRow[],
    awardConferenceId
  );
  const nominationByKey = new Map(
    nominationRows.map((n) => [`${n.nomination_type}:${n.rank}`, n] as const)
  );

  const nominationTypes: {
    id: NominationRubricType;
    label: string;
    slots: Array<{ rank: number; label: string; required: boolean }>;
    helper: string;
    criteria: RubricCriterion[];
  }[] = [
    {
      id: "committee_best_delegate",
      label: tPage("types.committeeBestDelegate.label"),
      slots: [
        { rank: 1, label: tPage("types.committeeBestDelegate.slots.nominee"), required: true },
        { rank: 2, label: tPage("types.committeeBestDelegate.slots.backup"), required: true },
      ],
      helper: tPage("types.committeeBestDelegate.helper"),
      criteria: criteriaForNominationType("committee_best_delegate"),
    },
    {
      id: "committee_honourable_mention",
      label: tPage("types.committeeHonourableMention.label"),
      slots: hmRequiresTwo
        ? [
            { rank: 1, label: tPage("types.committeeHonourableMention.slots.required1"), required: true },
            { rank: 2, label: tPage("types.committeeHonourableMention.slots.required2"), required: true },
            { rank: 3, label: tPage("types.committeeHonourableMention.slots.backup"), required: false },
          ]
        : [
            { rank: 1, label: tPage("types.committeeHonourableMention.slots.required1"), required: true },
            { rank: 2, label: tPage("types.committeeHonourableMention.slots.optional2"), required: false },
          ],
      helper: hmRequiresTwo
        ? tPage("types.committeeHonourableMention.helperRequiresTwo")
        : tPage("types.committeeHonourableMention.helperOptionalSecond"),
      criteria: criteriaForNominationType("committee_best_delegate"),
    },
    {
      id: "committee_best_position_paper",
      label: tPage("types.committeeBestPositionPaper.label"),
      slots: [
        { rank: 1, label: tPage("types.committeeBestPositionPaper.slots.nominee"), required: true },
        { rank: 2, label: tPage("types.committeeBestPositionPaper.slots.backup"), required: true },
      ],
      helper: tPage("types.committeeBestPositionPaper.helper"),
      criteria: criteriaForNominationType("committee_best_position_paper"),
    },
    {
      id: "conference_best_delegate",
      label: tPage("types.conferenceBestDelegate.label"),
      slots: [{ rank: 1, label: tPage("types.conferenceBestDelegate.slots.nominee"), required: true }],
      helper: tPage("types.conferenceBestDelegate.helper"),
      criteria: criteriaForNominationType("conference_best_delegate"),
    },
  ];

  const isSlotComplete = (typeId: NominationRubricType, rank: number, criteria: RubricCriterion[]) => {
    const existing = nominationByKey.get(`${typeId}:${rank}`);
    if (!existing?.nominee_profile_id) return false;
    const scores = existing.rubric_scores ?? {};
    return criteria.every((c) => Number(scores[c.key] ?? 0) >= 1);
  };

  const allRequiredKeys = nominationTypes.flatMap((t) =>
    t.slots.filter((s) => s.required).map((s) => `${t.id}:${s.rank}`)
  );
  const allSlotKeys = nominationTypes.flatMap((t) => t.slots.map((s) => `${t.id}:${s.rank}`));
  const serverCompletedKeys = allSlotKeys.filter((k) => {
    const lastColon = k.lastIndexOf(":");
    const typeId = k.slice(0, lastColon) as NominationRubricType;
    const rank = Number(k.slice(lastColon + 1));
    const criteria = nominationTypes.find((t) => t.id === typeId)!.criteria;
    return isSlotComplete(typeId, rank, criteria);
  });

  const alreadySubmittedToSmt = nominationRows.some((n) => n.status === "pending");
  const hasDraftNominations = nominationRows.some((n) => n.status === "draft");
  const allRequiredSlotsComplete = allRequiredKeys.every((k) => serverCompletedKeys.includes(k));
  const canSubmitToSmt =
    hasDraftNominations && allRequiredSlotsComplete && !alreadySubmittedToSmt && delegateMatrixComplete;
  const submittedAtIso = nominationRows.find((n) => n.submitted_to_smt_at)?.submitted_to_smt_at ?? null;
  const submittedAtLabel = submittedAtIso
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(submittedAtIso))
    : null;

  return (
    <MunPageShell title={t("score")}>
      <ChairAwardsShell
        score={
          <div className="space-y-5">
        <div className="rounded-xl border border-brand-navy/10 bg-logo-cyan/12 p-3 text-sm text-brand-muted">
          <p>
            {tPage.rich("intro.scoringMatches", {
              dashboard: (chunks) => (
                <a
                  href="https://thedashboard.seamuns.site/chair/awards"
                  className="font-medium text-brand-navy underline decoration-brand-navy/30 underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {chunks}
                </a>
              ),
              beginning: (chunks) => <strong className="text-brand-navy">{chunks}</strong>,
              developing: (chunks) => <strong className="text-brand-navy">{chunks}</strong>,
              proficient: (chunks) => <strong className="text-brand-navy">{chunks}</strong>,
              exemplary: (chunks) => <strong className="text-brand-navy">{chunks}</strong>,
            })}
          </p>
          <p className="mt-2 text-xs text-brand-navy/85">
            {tPage("intro.submissionRulePrefix")}{" "}
            <span className="font-mono text-[0.65rem]">{AWARD_SUBMISSION_DEADLINE_ISO}</span>{" "}
            {tPage("intro.submissionRuleSuffix")}
          </p>
          <ol className="mt-2.5 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-brand-navy/85">
            <li>{tPage("intro.steps.step1")}</li>
            <li>{tPage("intro.steps.step2")}</li>
            <li>{tPage("intro.steps.step3")}</li>
            <li>{tPage("intro.steps.step4")}</li>
            <li>{tPage("intro.steps.step5")}</li>
          </ol>
        </div>
        {profile?.role === "chair" && delegateMatrixPayload.length > 0 ? (
          <DelegateMatrixPanel
            committeeConferenceId={awardConferenceId}
            delegates={delegateMatrixPayload}
            scoresByProfileId={scoresByProfileId}
          />
        ) : null}
        <ChairSubmitToSmtPanel
          committeeConferenceId={awardConferenceId}
          canSubmit={canSubmitToSmt}
          alreadySubmitted={alreadySubmittedToSmt}
          submittedAtLabel={submittedAtLabel}
          showChairControls={profile?.role === "chair"}
          requiredSlotsDone={allRequiredKeys.filter((k) => serverCompletedKeys.includes(k)).length}
          requiredSlotsTotal={allRequiredKeys.length}
          delegateMatrixDone={delegateMatrixPayload.filter((d) =>
            matrixKeys.every((k) => Number(scoresByProfileId[d.userId]?.[k] ?? 0) >= 1)
          ).length}
          delegateMatrixTotal={delegateMatrixPayload.length}
        />
        {rankingDesc.length > 0 ? (
          <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4">
            <h3 className="font-display text-base font-semibold text-brand-navy mb-2">
              {tPage("ranking.title")}
            </h3>
            <p className="text-xs text-brand-muted mb-3">
              {tPage("ranking.description")}
            </p>
            <ol className="space-y-1.5 text-sm">
              {rankingDesc.map((r, i) => (
                <li
                  key={r.uid}
                  className="flex justify-between gap-3 border-b border-brand-navy/5 pb-1.5 last:border-0"
                >
                  <span className="text-brand-muted tabular-nums w-6 shrink-0">{i + 1}.</span>
                  <span className="flex-1 min-w-0 text-brand-navy">{r.label}</span>
                  <span className="font-mono tabular-nums text-brand-accent font-semibold shrink-0">{r.total}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <OverallAwardsProgress serverCompletedKeys={serverCompletedKeys} allRequiredKeys={allRequiredKeys} />
        <p className="text-xs text-brand-muted">
          {tPage("committeeLabel")}: {activeConf.committee?.trim() || activeConf.name}
          {activeConf.committee?.trim() && activeConf.name?.trim() ? (
            <span className="text-brand-muted/80"> · {activeConf.name}</span>
          ) : null}
        </p>

        {nominationTypes.map((type) => {
          return (
            <section
              key={type.id}
              className="rounded-xl border border-brand-navy/10 bg-logo-cyan/7 p-4 md:p-4 space-y-3"
            >
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-navy">{type.label}</h3>
                <p className="text-xs text-brand-muted mt-1">{type.helper}</p>
                <SectionAwardsProgress
                  nominationType={type.id}
                  requiredRanks={type.slots.filter((s) => s.required).map((s) => s.rank)}
                  optionalRanks={type.slots.filter((s) => !s.required).map((s) => s.rank)}
                  serverCompletedKeys={serverCompletedKeys}
                />
              </div>
              {type.slots.map((slot) => {
                const rank = slot.rank;
                const existing = nominationByKey.get(`${type.id}:${rank}`);
                const selectedId = existing?.nominee_profile_id ?? "";
                const scoreMap = existing?.rubric_scores ?? {};
                return (
                  <ChairNominationSlotForm
                    key={`${type.id}-${rank}`}
                    committeeConferenceId={awardConferenceId}
                    nominationType={type.id}
                    rank={rank}
                    slotRequired={slot.required}
                    slotLabel={slot.label}
                    typeLabel={type.label}
                    options={nomineeOptionsForSlot(delegateRows, delegateRowsAll, selectedId)}
                    delegateByUserId={delegateByUserId}
                    selectedNomineeId={selectedId}
                    scoreMap={scoreMap as Record<string, number>}
                    evidenceNote={existing?.evidence_note ?? null}
                    nominationRowId={existing?.id ?? null}
                    criteria={type.criteria}
                    locked={existing?.status === "pending"}
                  />
                );
              })}
            </section>
          );
        })}
          </div>
        }
        rubric={<AwardsRubricReference />}
      />
    </MunPageShell>
  );
}
