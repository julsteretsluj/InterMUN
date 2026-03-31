import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { submitChairTopNominationAction } from "@/app/actions/awards";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import {
  criteriaForNominationType,
  maxRubricTotal,
  PROFICIENCY_BAND_LABEL,
  PROFICIENCY_BAND_ORDER,
  rubricNumericTotal,
  scoreToBand,
  type NominationRubricType,
  type RubricCriterion,
} from "@/lib/seamuns-award-scoring";

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
      .select("id, user_id, country, profiles(name)")
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

  type DelegateRow = {
    id: string;
    user_id: string | null;
    country: string;
    profiles: { name: string | null } | { name: string | null }[] | null;
  };
  const delegateRows = sortRowsByAllocationCountry((delegates ?? []) as DelegateRow[]);
  const options = delegateRows
    .filter((d) => !!d.user_id)
    .map((d) => {
      const embed = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
      const name = embed?.name?.trim() || d.user_id!.slice(0, 8);
      return {
        userId: d.user_id!,
        label: `${d.country} — ${name}`,
      };
    });
  const seatedDelegatesCount = options.length;
  const hmRequiresBackup = seatedDelegatesCount > 23;

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
      slots: hmRequiresBackup
        ? [
            { rank: 1, label: "Honourable Mention #1", required: true },
            { rank: 2, label: "Honourable Mention #2", required: true },
            { rank: 3, label: "Honourable Mention backup", required: true },
          ]
        : [
            { rank: 1, label: "Honourable Mention #1 (optional)", required: false },
            { rank: 2, label: "Honourable Mention #2 (optional)", required: false },
          ],
      helper: hmRequiresBackup
        ? "Committee has more than 23 seated delegates: submit 2 Honourable Mentions plus 1 backup (3 total)."
        : "Submit up to 2 Honourable Mentions.",
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

  const totalRequiredAwards = nominationTypes.reduce(
    (sum, t) => sum + t.slots.filter((s) => s.required).length,
    0
  );
  const totalCompletedAwards = nominationTypes.reduce(
    (sum, t) => sum + t.slots.filter((s) => s.required && isSlotComplete(t.id, s.rank, t.criteria)).length,
    0
  );
  const totalProgressPct =
    totalRequiredAwards === 0 ? 0 : Math.round((totalCompletedAwards / totalRequiredAwards) * 100);

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
        <div className="rounded-xl border border-brand-navy/10 bg-sky-50/65 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-brand-navy/85">
            <span className="font-semibold uppercase tracking-wide">Overall awards completion</span>
            <span>
              {totalCompletedAwards}/{totalRequiredAwards} complete
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-navy/10">
            <div className="h-full bg-brand-gold transition-all" style={{ width: `${totalProgressPct}%` }} />
          </div>
        </div>
        <p className="text-xs text-brand-muted">
          Committee: {[activeConf.name, activeConf.committee].filter(Boolean).join(" — ")}
        </p>

        {nominationTypes.map((type) => {
          const maxTotal = maxRubricTotal(type.id);
          return (
            <section
              key={type.id}
              className="rounded-xl border border-brand-navy/10 bg-sky-50/35 p-4 md:p-4 space-y-3"
            >
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-navy">{type.label}</h3>
                <p className="text-xs text-brand-muted mt-1">{type.helper}</p>
                <div className="mt-3 rounded-lg border border-brand-navy/10 bg-sky-50/55 p-3">
                  {(() => {
                    const requiredTotal = type.slots.filter((s) => s.required).length;
                    const requiredCompleted = type.slots.filter(
                      (s) => s.required && isSlotComplete(type.id, s.rank, type.criteria)
                    ).length;
                    const optionalTotal = type.slots.filter((s) => !s.required).length;
                    const optionalCompleted = type.slots.filter(
                      (s) => !s.required && isSlotComplete(type.id, s.rank, type.criteria)
                    ).length;
                    const pct =
                      requiredTotal === 0 ? 100 : Math.round((requiredCompleted / requiredTotal) * 100);
                    return (
                      <>
                        <div className="flex items-center justify-between text-xs text-brand-navy/85 mb-2">
                          <span className="font-semibold">Progress (required)</span>
                          <span>
                            {requiredCompleted}/{requiredTotal} complete
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-brand-navy/10 overflow-hidden">
                          <div className="h-full bg-brand-gold transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        {optionalTotal > 0 ? (
                          <p className="mt-2 text-[0.72rem] text-brand-muted">
                            Optional slots: {optionalCompleted}/{optionalTotal} filled
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>
              {type.slots.map((slot) => {
                const rank = slot.rank;
                const existing = nominationByKey.get(`${type.id}:${rank}`);
                const selectedId = existing?.nominee_profile_id ?? "";
                const scoreMap = existing?.rubric_scores ?? {};
                const criteriaTotal = rubricNumericTotal(scoreMap, type.id);
                return (
                  <form key={`${type.id}-${rank}`} action={submitChairTopNominationAction} className="space-y-3">
                    <input type="hidden" name="committee_conference_id" value={activeConf.id} />
                    <input type="hidden" name="nomination_type" value={type.id} />
                    <input type="hidden" name="rank" value={String(rank)} />
                    <h4 className="text-sm font-semibold text-brand-navy">
                      {slot.label}
                      {!slot.required ? (
                        <span className="ml-2 text-xs font-normal text-brand-muted">(optional)</span>
                      ) : null}
                    </h4>
                    <label className="block text-sm">
                      <span className="text-brand-muted text-xs uppercase">Nominee</span>
                      <select
                        name="nominee_profile_id"
                        defaultValue={selectedId}
                        required={slot.required}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/25 text-brand-navy"
                      >
                        <option value="">
                          {slot.required ? "Select delegate" : "Leave blank for no submission"}
                        </option>
                        {options.map((o) => (
                          <option key={`${type.id}-${rank}-${o.userId}`} value={o.userId}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-lg border border-white/12 bg-black/25 p-3 text-brand-navy space-y-2.5">
                      <p className="text-brand-muted text-xs uppercase font-semibold tracking-wide">
                        Criteria (SEAMUNs bands — pick one per row)
                      </p>
                      {type.criteria.map((criterion) => {
                        const existingScore = Number(scoreMap[criterion.key] ?? 0);
                        const defaultBand = scoreToBand(existingScore);
                        return (
                          <fieldset
                            key={`${type.id}-${rank}-${criterion.key}`}
                            className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-1.5"
                          >
                            <legend className="text-sm font-semibold text-brand-navy px-1">{criterion.label}</legend>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              {PROFICIENCY_BAND_ORDER.map((bandId, i) => (
                                (() => {
                                  const tone =
                                    bandId === "beginning"
                                      ? "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-950/20"
                                      : bandId === "developing"
                                        ? "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-950/20"
                                        : bandId === "proficient"
                                          ? "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/30 dark:bg-sky-950/20"
                                          : "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-950/20";
                                  return (
                                <label
                                  key={bandId}
                                  className={`flex gap-1.5 cursor-pointer rounded-lg border p-2 ${tone} has-[:checked]:ring-2 has-[:checked]:ring-brand-gold/60 has-[:checked]:border-brand-gold/70`}
                                >
                                  <input
                                    type="radio"
                                    name={`band_${criterion.key}`}
                                    value={bandId}
                                    required={slot.required}
                                    defaultChecked={defaultBand === bandId}
                                    className="mt-1 shrink-0"
                                  />
                                  <span className="min-w-0 text-xs leading-snug">
                                    <span className="font-semibold text-brand-navy">
                                      {PROFICIENCY_BAND_LABEL[bandId]}
                                    </span>
                                    <span className="block text-brand-navy/80 mt-0.5">{criterion.bandDescriptions[i]}</span>
                                  </span>
                                </label>
                                  );
                                })()
                              ))}
                            </div>
                          </fieldset>
                        );
                      })}
                      <p className="text-xs text-brand-muted pt-1">
                        Rubric total:{" "}
                        <strong className="text-brand-navy">
                          {criteriaTotal}/{maxTotal}
                        </strong>{" "}
                        (stored on a 1–8 scale per criterion; bands map to 2 / 4 / 6 / 8)
                      </p>
                    </div>
                    <label className="block text-sm">
                      <span className="text-brand-muted text-xs uppercase">Statement of confirmation / evidence</span>
                      <textarea
                        name="evidence_note"
                        defaultValue={existing?.evidence_note ?? ""}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/25 text-brand-navy placeholder:text-brand-muted/70"
                        placeholder="Cite concrete floor evidence (clauses drafted, compromises brokered, key interventions)."
                      />
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-brand-gold text-white font-semibold"
                    >
                      {slot.required ? `Save ${type.label} top ${rank}` : `Save optional ${type.label} slot`}
                    </button>
                  </form>
                );
              })}
            </section>
          );
        })}
      </div>
    </MunPageShell>
  );
}
