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

  if (profile?.role === "chair") {
    const { data: chairSeat } = await supabase
      .from("allocations")
      .select("id")
      .eq("conference_id", activeConf.id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!chairSeat?.id) {
      redirect("/chair/allocation-matrix");
    }
  }

  const [{ data: delegates }, { data: nominations }] = await Promise.all([
    supabase
      .from("allocations")
      .select("id, user_id, country, profiles(name, role)")
      .eq("conference_id", activeConf.id)
      .not("user_id", "is", null)
      .order("country", { ascending: true }),
    supabase
      .from("award_nominations")
      .select("id, nomination_type, rank, evidence_note, rubric_scores, status, nominee_profile_id, profiles(name)")
      .eq("committee_conference_id", activeConf.id)
      .eq("status", "pending")
      .order("nomination_type", { ascending: true })
      .order("rank", { ascending: true }),
  ]);

  const delegateRowsAll = sortRowsByAllocationCountry((delegates ?? []) as DelegateRow[]);
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
  /** Second HM is required only when there are more than 22 seated delegates. */
  const hmRequiresTwo = seatedDelegatesCount > 22;

  type NomRow = {
    id: string;
    nomination_type: NominationRubricType;
    rank: number;
    evidence_note: string | null;
    rubric_scores: Record<string, number> | null;
    status: string;
    nominee_profile_id: string;
    profiles: { name: string | null } | { name: string | null }[] | null;
  };
  const nominationRows = (nominations ?? []) as NomRow[];
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
      label: "Best Delegate (committee)",
      slots: [
        { rank: 1, label: "Best Delegate nominee", required: true },
        { rank: 2, label: "Best Delegate backup", required: true },
      ],
      helper: "Submit one primary Best Delegate nominee and one backup.",
      criteria: criteriaForNominationType("committee_best_delegate"),
    },
    {
      id: "committee_honourable_mention",
      label: "Honourable Mention (committee)",
      slots: hmRequiresTwo
        ? [
            { rank: 1, label: "Honourable Mention #1", required: true },
            { rank: 2, label: "Honourable Mention #2", required: true },
            { rank: 3, label: "Honourable Mention backup", required: false },
          ]
        : [
            { rank: 1, label: "Honourable Mention #1", required: true },
            { rank: 2, label: "Honourable Mention #2 (optional)", required: false },
          ],
      helper: hmRequiresTwo
        ? "More than 22 seated delegates: submit 2 Honourable Mentions (required). Optional backup rank for SMT."
        : "Submit at least 1 Honourable Mention (required). Second HM is optional.",
      criteria: criteriaForNominationType("committee_best_delegate"),
    },
    {
      id: "committee_best_position_paper",
      label: "Best Position Paper (committee)",
      slots: [
        { rank: 1, label: "Best Position Paper nominee", required: true },
        { rank: 2, label: "Best Position Paper backup", required: true },
      ],
      helper: "Submit one primary Best Position Paper nominee and one backup.",
      criteria: criteriaForNominationType("committee_best_position_paper"),
    },
    {
      id: "conference_best_delegate",
      label: "Best Delegate (overall conference)",
      slots: [{ rank: 1, label: "Overall Best Delegate nominee", required: true }],
      helper: "Submit one overall Best Delegate nominee from this committee.",
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

  return (
    <MunPageShell title="Score">
      <div className="space-y-5 max-w-6xl">
        <div className="rounded-xl border border-brand-navy/10 bg-sky-50/70 p-3 text-sm text-brand-muted">
          <p>
            Scoring matches the{" "}
            <a
              href="https://thedashboard.seamuns.site/chair/awards"
              className="font-medium text-brand-navy underline decoration-brand-navy/30 underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              SEAMUNs dashboard
            </a>
            : for each criterion choose{" "}
            <strong className="text-brand-navy">Beginning</strong>,{" "}
            <strong className="text-brand-navy">Developing</strong>,{" "}
            <strong className="text-brand-navy">Proficient</strong>, or{" "}
            <strong className="text-brand-navy">Exemplary</strong>. Submit Top 2 with evidence; SMT confirms final
            awards.
          </p>
          <ol className="mt-2.5 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-brand-navy/85">
            <li>Select a nominee for each required Top slot.</li>
            <li>Pick exactly one band for every criterion row.</li>
            <li>Add concise evidence from debate, drafting, and diplomacy.</li>
            <li>Save required slots and add optional slots where applicable.</li>
          </ol>
        </div>
        <OverallAwardsProgress serverCompletedKeys={serverCompletedKeys} allRequiredKeys={allRequiredKeys} />
        <p className="text-xs text-brand-muted">
          Committee: {[activeConf.name, activeConf.committee].filter(Boolean).join(" — ")}
        </p>

        {nominationTypes.map((type) => {
          return (
            <section
              key={type.id}
              className="rounded-xl border border-brand-navy/10 bg-sky-50/35 p-4 md:p-4 space-y-3"
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
                    committeeConferenceId={activeConf.id}
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
                  />
                );
              })}
            </section>
          );
        })}
      </div>
    </MunPageShell>
  );
}
