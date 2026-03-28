import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { submitChairTopNominationAction } from "@/app/actions/awards";

type ScoreLevel = { value: number; description: string };

function levelsFromPairs(beginning: string, developing: string, proficient: string, exemplary: string): ScoreLevel[] {
  return [
    { value: 1, description: beginning },
    { value: 2, description: beginning },
    { value: 3, description: developing },
    { value: 4, description: developing },
    { value: 5, description: proficient },
    { value: 6, description: proficient },
    { value: 7, description: exemplary },
    { value: 8, description: exemplary },
  ];
}

// SEAMUN I 2027 Awards guide: "Delegate Criteria" scale text (1-8 mapped from 1–2 / 3–4 / 5–6 / 7–8).
const DELEGATE_LEVELS_BY_CRITERION: Record<
  "creativity" | "diplomacy" | "collaboration" | "leadership" | "knowledge_research" | "participation",
  ScoreLevel[]
> = {
  creativity: levelsFromPairs(
    `Proposes repetitive or standard solutions; rarely thinks outside the existing framework.`,
    `Offers some original ideas but struggles to adapt them to changing committee dynamics.`,
    `Frequently suggests innovative solutions and unique clauses for draft resolutions.`,
    `Highly creative; develops "game-changing" compromises that bridge clashing blocs.`
  ),
  diplomacy: levelsFromPairs(
    `Lacks professional decorum; occasionally dismissive of other delegates' viewpoints.`,
    `Respectful but unremarkable; maintains a neutral presence without building rapport.`,
    `Consistently professional; actively seeks to understand and incorporate opposing views.`,
    `Exemplifies true statesmanship; commands respect while remaining humble and inclusive.`
  ),
  collaboration: levelsFromPairs(
    `Works in isolation or refuses to compromise on minor details; disrupts group work.`,
    `Contributes to a bloc but does not take an active role in drafting or merging ideas.`,
    `A strong team player; helps merge resolutions and ensures all bloc members have a voice.`,
    `The "glue" of the committee brings disparate groups together and facilitates consensus.`
  ),
  leadership: levelsFromPairs(
    `Passive; waits for others to initiate motions or start discussions during caucuses.`,
    `Shows leadership in small groups but is hesitant to lead the house or present for the bloc.`,
    `Takes clear initiative; leads unmoderated caucuses and manages the drafting process.`,
    `Visionary leader; sets the tone for the room and inspires others through action and guidance.`
  ),
  knowledge_research: levelsFromPairs(
    `Frequently confused by the topic; relies on generalities rather than specific facts.`,
    `Has a basic understanding of the agenda but misses technical or legal nuances.`,
    `Demonstrates strong command of the topic; cites relevant stats and UN past actions.`,
    `Expert-level mastery; uses deep research to navigate technical debates and debunk false info.`
  ),
  participation: levelsFromPairs(
    `Rarely speaks; frequently absent during caucusing or inactive during voting.`,
    `Speaks occasionally in moderated caucuses; participates only when prompted.`,
    `Consistently active in all sessions; frequently raises motions and contributes to the floor.`,
    `Necessary and consistent presence; engages in every aspect of the debate from start to finish.`
  ),
};

// SEAMUN I 2027 Awards guide: "Position Paper Criteria" scale text (1-8 mapped from 1–2 / 3–4 / 5–6 / 7–8).
const PAPER_LEVELS_BY_CRITERION: Record<
  "research_depth" | "country_stance_alignment" | "policy_accuracy" | "proposed_solutions" | "formatting_style_citations",
  ScoreLevel[]
> = {
  research_depth: levelsFromPairs(
    `Minimal data; lacks specific UN resolutions, treaty citations, or historical context.`,
    `Basic data provided; mentions well-known treaties but lacks specific localised evidence.`,
    `Strong research; includes relevant stats, past UN actions, and committee-specific history.`,
    `Exceptional depth; identifies niche legal loopholes, specific funding gaps, or rare data points.`
  ),
  country_stance_alignment: levelsFromPairs(
    `Frequently contradicts the assigned country's real-world geopolitical interests or voting history.`,
    `Generally follows policy but lacks clarity on sensitive or controversial national stances.`,
    `Consistently accurate; clearly reflects the nation's strategic regional and global interests.`,
    `Highly nuanced; addresses complex regional dynamics and clearly defines national "red lines."`
  ),
  policy_accuracy: levelsFromPairs(
    `Fundamental misunderstanding of the topic's legal framework or the committee's mandate.`,
    `Understands the general topic but misses technical or legal complexities within current policy.`,
    `Solid grasp of complex policy issues (e.g., specific clauses in international law).`,
    `Expert-level accuracy; integrates technical facts to build a sophisticated policy argument.`
  ),
  proposed_solutions: levelsFromPairs(
    `Vague or non-actionable (e.g., "countries should talk more"). No implementation plan.`,
    `Generic solutions; lack details on funding, specific UN agencies, or feasibility.`,
    `Innovative and actionable; proposes specific mechanisms, task forces, or monitoring bodies.`,
    `Sophisticated and holistic; solutions are original, feasible, and legally sound with clear timelines.`
  ),
  formatting_style_citations: levelsFromPairs(
    `Significant errors in UN citation style (e.g., Chicago/APA); unprofessional tone.`,
    `Standard formatting, but contains several grammatical gaps or inconsistent citation styles.`,
    `Professional UN academic formatting; clear, concise, and persuasive diplomatic language.`,
    `Flawless UN academic style; compelling narrative and perfect citation of all sources.`
  ),
};

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
    criteria: {
      key: string;
      label: string;
      levels: ScoreLevel[];
    }[];
  }[] = [
    {
      id: "committee_best_delegate",
      label: "Best Delegate (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 contenders for committee best delegate.",
      criteria: [
        { key: "creativity", label: "Creativity", levels: DELEGATE_LEVELS_BY_CRITERION.creativity },
        { key: "diplomacy", label: "Diplomacy", levels: DELEGATE_LEVELS_BY_CRITERION.diplomacy },
        { key: "collaboration", label: "Collaboration", levels: DELEGATE_LEVELS_BY_CRITERION.collaboration },
        { key: "leadership", label: "Leadership", levels: DELEGATE_LEVELS_BY_CRITERION.leadership },
        {
          key: "knowledge_research",
          label: "Knowledge and Research",
          levels: DELEGATE_LEVELS_BY_CRITERION.knowledge_research,
        },
        { key: "participation", label: "Participation", levels: DELEGATE_LEVELS_BY_CRITERION.participation },
      ],
    },
    {
      id: "committee_best_position_paper",
      label: "Best Position Paper (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 position papers for SMT review.",
      criteria: [
        {
          key: "research_depth",
          label: "Research Depth",
          levels: PAPER_LEVELS_BY_CRITERION.research_depth,
        },
        {
          key: "country_stance_alignment",
          label: "Country Stance Alignment",
          levels: PAPER_LEVELS_BY_CRITERION.country_stance_alignment,
        },
        { key: "policy_accuracy", label: "Policy Accuracy", levels: PAPER_LEVELS_BY_CRITERION.policy_accuracy },
        {
          key: "proposed_solutions",
          label: "Proposed Solutions",
          levels: PAPER_LEVELS_BY_CRITERION.proposed_solutions,
        },
        {
          key: "formatting_style_citations",
          label: "Formatting, Style and Citations",
          levels: PAPER_LEVELS_BY_CRITERION.formatting_style_citations,
        },
      ],
    },
    {
      id: "conference_best_delegate",
      label: "Best Delegate (overall conference)",
      slots: [1],
      helper: "Submit your single strongest overall candidate from this committee.",
      criteria: [
        { key: "creativity", label: "Creativity", levels: DELEGATE_LEVELS_BY_CRITERION.creativity },
        { key: "diplomacy", label: "Diplomacy", levels: DELEGATE_LEVELS_BY_CRITERION.diplomacy },
        { key: "collaboration", label: "Collaboration", levels: DELEGATE_LEVELS_BY_CRITERION.collaboration },
        { key: "leadership", label: "Leadership", levels: DELEGATE_LEVELS_BY_CRITERION.leadership },
        {
          key: "knowledge_research",
          label: "Knowledge and Research",
          levels: DELEGATE_LEVELS_BY_CRITERION.knowledge_research,
        },
        { key: "participation", label: "Participation", levels: DELEGATE_LEVELS_BY_CRITERION.participation },
      ],
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
                            {criterion.levels.map((level) => (
                              <option
                                key={`${type.id}-${rank}-${criterion.key}-${level.value}`}
                                value={level.value}
                              >
                                {level.value} - {level.description}
                              </option>
                            ))}
                          </select>
                          <div className="mt-2 text-[11px] rounded-md border border-brand-navy/10 bg-brand-cream/20 p-2">
                            <div className="font-semibold text-brand-navy/85 mb-1">Level guide</div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {criterion.levels.map((lvl) => (
                                <div key={`${criterion.key}-lvl-${lvl.value}`} className="min-w-0 break-words">
                                  <strong className="text-brand-navy">{lvl.value}</strong>
                                  <span className="text-brand-navy/70">: {lvl.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
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
