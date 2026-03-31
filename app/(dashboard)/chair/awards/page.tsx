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
    slots: number[];
    helper: string;
    criteria: RubricCriterion[];
  }[] = [
    {
      id: "committee_best_delegate",
      label: "Best Delegate (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 contenders for committee best delegate (same rubric as SEAMUNs dashboard).",
      criteria: criteriaForNominationType("committee_best_delegate"),
    },
    {
      id: "committee_best_position_paper",
      label: "Best Position Paper (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 position papers for SMT review.",
      criteria: criteriaForNominationType("committee_best_position_paper"),
    },
    {
      id: "conference_best_delegate",
      label: "Best Delegate (overall conference)",
      slots: [1],
      helper: "Submit your single strongest overall candidate from this committee.",
      criteria: criteriaForNominationType("conference_best_delegate"),
    },
  ];

  return (
    <MunPageShell title="Score">
      <div className="space-y-6 max-w-6xl">
        <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-4 text-sm text-brand-muted">
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
        </div>
        <p className="text-xs text-brand-muted">
          Committee: {[activeConf.name, activeConf.committee].filter(Boolean).join(" — ")}
        </p>

        {nominationTypes.map((type) => {
          const maxTotal = maxRubricTotal(type.id);
          return (
            <section
              key={type.id}
              className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5 space-y-4"
            >
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-navy">{type.label}</h3>
                <p className="text-xs text-brand-muted mt-1">{type.helper}</p>
                <div className="mt-3 rounded-lg border border-brand-navy/10 bg-brand-cream/40 p-3">
                  {(() => {
                    const completed = type.slots.filter((rank) => {
                      const existing = nominationByKey.get(`${type.id}:${rank}`);
                      if (!existing?.nominee_profile_id) return false;
                      const scores = existing.rubric_scores ?? {};
                      return type.criteria.every((c) => Number(scores[c.key] ?? 0) >= 1);
                    }).length;
                    const totalSlots = type.slots.length;
                    const pct = totalSlots === 0 ? 0 : Math.round((completed / totalSlots) * 100);
                    return (
                      <>
                        <div className="flex items-center justify-between text-xs text-brand-navy/85 mb-2">
                          <span className="font-semibold">Progress</span>
                          <span>
                            {completed}/{totalSlots} complete
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-brand-navy/10 overflow-hidden">
                          <div className="h-full bg-brand-gold transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              {type.slots.map((rank) => {
                const existing = nominationByKey.get(`${type.id}:${rank}`);
                const selectedId = existing?.nominee_profile_id ?? "";
                const scoreMap = existing?.rubric_scores ?? {};
                const criteriaTotal = rubricNumericTotal(scoreMap, type.id);
                return (
                  <form key={`${type.id}-${rank}`} action={submitChairTopNominationAction} className="space-y-3">
                    <input type="hidden" name="committee_conference_id" value={activeConf.id} />
                    <input type="hidden" name="nomination_type" value={type.id} />
                    <input type="hidden" name="rank" value={String(rank)} />
                    <h4 className="text-sm font-semibold text-brand-navy">Top {rank}</h4>
                    <label className="block text-sm">
                      <span className="text-brand-muted text-xs uppercase">Nominee</span>
                      <select
                        name="nominee_profile_id"
                        defaultValue={selectedId}
                        required
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-black/25 text-brand-navy"
                      >
                        <option value="" disabled>
                          Select delegate
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
                            className="rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-2"
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
                                  className={`flex gap-2 cursor-pointer rounded-lg border p-2 ${tone} has-[:checked]:ring-2 has-[:checked]:ring-brand-gold/60 has-[:checked]:border-brand-gold/70`}
                                >
                                  <input
                                    type="radio"
                                    name={`band_${criterion.key}`}
                                    value={bandId}
                                    required
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
                      Save {type.label} top {rank}
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
