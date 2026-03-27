import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { submitChairTopNominationAction } from "@/app/actions/awards";

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
      redirect("/chair/committee-access");
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
      .select("id, nomination_type, rank, evidence_note, status, nominee_profile_id, profiles(name)")
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
    criteria: string[];
  }[] = [
    {
      id: "committee_best_delegate",
      label: "Best Delegate (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 contenders for committee best delegate.",
      criteria: [
        "Diplomacy & collaboration (bridges blocs, includes quieter delegates).",
        "Leadership & participation (consistent floor presence, initiates motions/caucuses).",
        "Knowledge & research depth (accurate RoP/topic command with specific evidence).",
        "Creativity & policy impact (actionable clauses, meaningful compromise outcomes).",
      ],
    },
    {
      id: "committee_best_position_paper",
      label: "Best Position Paper (committee)",
      slots: [1, 2],
      helper: "Submit Top 2 position papers for SMT review.",
      criteria: [
        "Research depth (specific data, treaties, legal/policy context).",
        "Country stance alignment (reflects real national red lines and interests).",
        "Policy accuracy & solutions (feasible, mandate-accurate implementation detail).",
        "Formatting/style/citations (professional academic standard, clear sourcing).",
      ],
    },
    {
      id: "conference_best_delegate",
      label: "Best Delegate (overall conference)",
      slots: [1],
      helper: "Submit your single strongest overall candidate from this committee.",
      criteria: [
        "Cross-session consistency in diplomacy, leadership, and substantive impact.",
        "Mastery of Rules of Procedure and high-quality floor interventions.",
        "Evidence of conference-level influence beyond own bloc/committee moments.",
        "Strong written confirmation with specific examples for SMT final vetting.",
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
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-brand-navy/80">
                  Criteria checklist
                </p>
                <ul className="mt-1 space-y-1 text-xs text-brand-navy/85">
                  {type.criteria.map((item) => (
                    <li key={`${type.id}-${item}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
            {type.slots.map((rank) => {
              const existing = nominationByKey.get(`${type.id}:${rank}`);
              const selectedId = existing?.nominee_profile_id ?? "";
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
