import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { submitChairTopNominationAction } from "@/app/actions/awards";

const DELEGATE_LEVELS = [
  { value: 1, description: "Very weak: almost no clear evidence." },
  { value: 2, description: "Weak: limited impact, inconsistent quality." },
  { value: 3, description: "Below standard: some attempts, low effectiveness." },
  { value: 4, description: "Developing: acceptable but still uneven." },
  { value: 5, description: "Solid: reliable and clearly competent." },
  { value: 6, description: "Strong: frequent impact and good consistency." },
  { value: 7, description: "Excellent: high-level performance with clear leadership." },
  { value: 8, description: "Outstanding: exceptional, committee-best standard." },
] as const;

const PAPER_LEVELS = [
  { value: 1, description: "Very weak: minimal research and poor structure." },
  { value: 2, description: "Weak: limited depth and unclear alignment." },
  { value: 3, description: "Below standard: basic points, little rigor." },
  { value: 4, description: "Developing: adequate but with notable gaps." },
  { value: 5, description: "Solid: clear, accurate, and reasonably supported." },
  { value: 6, description: "Strong: detailed and well-argued with good sourcing." },
  { value: 7, description: "Excellent: advanced analysis and polished delivery." },
  { value: 8, description: "Outstanding: exceptional rigor, originality, and precision." },
] as const;

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
  const delegateRows = (delegates ?? []) as DelegateRow[];
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
    nomination_type: "committee_best_delegate" | "committee_best_position_paper" | "conference_best_delegate";
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
    id: NomRow["nomination_type"];
    label: string;
    slots: number[];
    helper: string;
    criteria: { key: string; label: string }[];
    levels: ReadonlyArray<{ value: number; description: string }>;
  }[] = [
    {
      id: "committee_best_delegate",
      label: "Best Delegate (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 contenders for committee best delegate.",
      criteria: [
        { key: "creativity", label: "Creativity" },
        { key: "diplomacy", label: "Diplomacy" },
        { key: "collaboration", label: "Collaboration" },
        { key: "leadership", label: "Leadership" },
        { key: "knowledge_research", label: "Knowledge and Research" },
        { key: "participation", label: "Participation" },
      ],
      levels: DELEGATE_LEVELS,
    },
    {
      id: "committee_best_position_paper",
      label: "Best Position Paper (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 position papers for SMT review.",
      criteria: [
        { key: "research_depth", label: "Research Depth" },
        { key: "country_stance_alignment", label: "Country Stance Alignment" },
        { key: "policy_accuracy", label: "Policy Accuracy" },
        { key: "proposed_solutions", label: "Proposed Solutions" },
        { key: "formatting_style_citations", label: "Formatting, Style and Citations" },
      ],
      levels: PAPER_LEVELS,
    },
    {
      id: "conference_best_delegate",
      label: "Best Delegate (overall conference)",
      slots: [1],
      helper: "Submit your single strongest overall candidate from this committee.",
      criteria: [
        { key: "creativity", label: "Creativity" },
        { key: "diplomacy", label: "Diplomacy" },
        { key: "collaboration", label: "Collaboration" },
        { key: "leadership", label: "Leadership" },
        { key: "knowledge_research", label: "Knowledge and Research" },
        { key: "participation", label: "Participation" },
      ],
      levels: DELEGATE_LEVELS,
    },
  ];

  return (
    <MunPageShell title="Awards nomination (chair)">
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-4 text-sm text-brand-muted">
          Submit your committee&apos;s <strong className="text-brand-navy">Top 2</strong> nominees with
          evidence notes. SMT will make the final award decisions from these submissions.
        </div>
        <p className="text-xs text-brand-muted">
          Committee: {[activeConf.name, activeConf.committee].filter(Boolean).join(" — ")}
        </p>

        {nominationTypes.map((type) => (
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
                  const total = type.slots.length;
                  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
                  return (
                    <>
                      <div className="flex items-center justify-between text-xs text-brand-navy/85 mb-2">
                        <span className="font-semibold">Progress</span>
                        <span>
                          {completed}/{total} complete
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
              const criteriaTotal = type.criteria.reduce((sum, c) => sum + Number(scoreMap[c.key] ?? 0), 0);
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
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15 bg-white"
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
                  <div className="rounded-lg border border-brand-navy/10 bg-white p-3">
                    <p className="text-brand-muted text-xs uppercase mb-2">
                      Criteria scores (rate each 1-8)
                    </p>
                    <div className="rounded-md border border-brand-navy/10 bg-brand-cream/30 p-2 mb-3">
                      <p className="text-[11px] font-semibold text-brand-navy mb-1">Score guide</p>
                      <ul className="space-y-1">
                        {type.levels.map((level) => (
                          <li key={`${type.id}-level-${level.value}`} className="text-[11px] text-brand-navy/85">
                            <strong>{level.value}</strong>: {level.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {type.criteria.map((criterion) => (
                        <label key={`${type.id}-${rank}-${criterion.key}`} className="text-sm">
                          <span className="text-brand-navy/80 text-xs">{criterion.label}</span>
                          <select
                            name={`score_${criterion.key}`}
                            required
                            defaultValue={String(Number(scoreMap[criterion.key] ?? 0) || "")}
                            className="mt-1 w-full px-2 py-2 rounded-lg border border-brand-navy/15 bg-white text-sm"
                          >
                            <option value="" disabled>
                              Score
                            </option>
                            {type.levels.map((level) => (
                              <option
                                key={`${type.id}-${rank}-${criterion.key}-${level.value}`}
                                value={level.value}
                              >
                                {level.value} - {level.description}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-brand-muted">
                      Current total:{" "}
                      <strong className="text-brand-navy">
                        {criteriaTotal}/{type.criteria.length * 8}
                      </strong>
                    </p>
                  </div>
                  <label className="block text-sm">
                    <span className="text-brand-muted text-xs uppercase">Statement of confirmation / evidence</span>
                    <textarea
                      name="evidence_note"
                      defaultValue={existing?.evidence_note ?? ""}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
                      placeholder="Cite concrete floor evidence (clauses drafted, compromises brokered, key interventions)."
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-brand-gold text-brand-navy font-medium"
                  >
                    Save {type.label} top {rank}
                  </button>
                </form>
              );
            })}
          </section>
        ))}
      </div>
    </MunPageShell>
  );
}
