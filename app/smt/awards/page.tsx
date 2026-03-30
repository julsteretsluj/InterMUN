import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AwardsManagerClient } from "@/app/(dashboard)/chair/awards/AwardsManagerClient";
import { promoteNominationToAwardAction } from "@/app/actions/awards";
import type { AwardAssignment } from "@/types/database";
import { isSmtRole } from "@/lib/roles";
import {
  maxRubricTotal,
  rubricBandInitials,
  rubricNumericTotal,
  type NominationRubricType,
} from "@/lib/seamuns-award-scoring";

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

  const [{ data: conferences }, { data: assignments }, { data: profiles }, { data: nominations }] = await Promise.all([
    supabase.from("conferences").select("id, name, committee").order("created_at", { ascending: false }),
    supabase.from("award_assignments").select("*").order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, name").order("name").limit(500),
    supabase
      .from("award_nominations")
      .select(
        "id, nomination_type, rank, status, evidence_note, rubric_scores, committee_conference_id, nominee_profile_id, profiles(name)"
      )
      .eq("status", "pending")
      .order("committee_conference_id", { ascending: true })
      .order("nomination_type", { ascending: true })
      .order("rank", { ascending: true }),
  ]);

  const confById = new Map((conferences ?? []).map((c) => [c.id, [c.name, c.committee].filter(Boolean).join(" — ")]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.name?.trim() || p.id.slice(0, 8)]));

  type NominationRow = {
    id: string;
    nomination_type: NominationRubricType;
    rank: number;
    status: string;
    evidence_note: string | null;
    rubric_scores: Record<string, number> | null;
    committee_conference_id: string;
    nominee_profile_id: string;
    profiles: { name: string | null } | { name: string | null }[] | null;
  };
  const nominationRows = (nominations ?? []) as NominationRow[];
  const nominationTypeLabel: Record<NominationRow["nomination_type"], string> = {
    committee_best_delegate: "Best Delegate (committee)",
    committee_best_position_paper: "Best Position Paper (committee)",
    conference_best_delegate: "Best Delegate (overall)",
  };

  return (
    <MunPageShell title="Awards">
      <section className="mb-8 rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">
          Chair Top 2 nominations (SMT review)
        </h2>
        <p className="text-xs text-brand-muted mb-3">
          Chairs score nominees with the same SEAMUNs-style bands (Beginning–Exemplary); rubric totals and band initials
          (B/D/P/E) summarize each row. SMT selects final awards from these nominations.
        </p>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-3 py-2">Committee</th>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Award type</th>
                <th className="px-3 py-2">Nominee</th>
                <th className="px-3 py-2">Rubric</th>
                <th className="px-3 py-2">Evidence</th>
                <th className="px-3 py-2">SMT action</th>
              </tr>
            </thead>
            <tbody>
              {nominationRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-brand-muted">
                    No pending chair nominations yet.
                  </td>
                </tr>
              ) : (
                nominationRows.map((n) => {
                  const profEmbed = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles;
                  const nomineeLabel =
                    profEmbed?.name?.trim() ||
                    profileById.get(n.nominee_profile_id) ||
                    n.nominee_profile_id.slice(0, 8);
                  return (
                    <tr key={n.id} className="border-t border-brand-navy/5 align-top">
                      <td className="px-3 py-2 text-brand-navy">
                        {confById.get(n.committee_conference_id) ?? n.committee_conference_id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-brand-navy font-medium">Top {n.rank}</td>
                      <td className="px-3 py-2 text-brand-navy/85">
                        {nominationTypeLabel[n.nomination_type]}
                      </td>
                      <td className="px-3 py-2">{nomineeLabel}</td>
                      <td className="px-3 py-2 text-brand-navy/90 text-xs align-top">
                        <span className="font-mono tabular-nums">
                          {rubricNumericTotal(n.rubric_scores, n.nomination_type)}/
                          {maxRubricTotal(n.nomination_type)}
                        </span>
                        <span className="block text-brand-muted mt-0.5" title="Band initials: B/D/P/E">
                          {rubricBandInitials(n.rubric_scores, n.nomination_type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-brand-muted max-w-md">
                        {n.evidence_note?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-2">
                          {n.nomination_type === "committee_best_delegate" ? (
                            <>
                              <form action={promoteNominationToAwardAction}>
                                <input type="hidden" name="nomination_id" value={n.id} />
                                <input type="hidden" name="category" value="committee_best_delegate" />
                                <button
                                  type="submit"
                                  className="text-xs px-2 py-1 rounded bg-brand-gold text-brand-navy font-medium"
                                >
                                  Select as Best Delegate
                                </button>
                              </form>
                              <form action={promoteNominationToAwardAction}>
                                <input type="hidden" name="nomination_id" value={n.id} />
                                <input type="hidden" name="category" value="committee_honourable_mention" />
                                <button
                                  type="submit"
                                  className="text-xs px-2 py-1 rounded border border-brand-navy/20 text-brand-navy"
                                >
                                  Select as Honourable Mention
                                </button>
                              </form>
                            </>
                          ) : null}
                          {n.nomination_type === "committee_best_position_paper" ? (
                            <form action={promoteNominationToAwardAction}>
                              <input type="hidden" name="nomination_id" value={n.id} />
                              <input type="hidden" name="category" value="committee_best_position_paper" />
                              <button
                                type="submit"
                                className="text-xs px-2 py-1 rounded bg-brand-gold text-brand-navy font-medium"
                              >
                                Select as Best Position Paper
                              </button>
                            </form>
                          ) : null}
                          {n.nomination_type === "conference_best_delegate" ? (
                            <form action={promoteNominationToAwardAction}>
                              <input type="hidden" name="nomination_id" value={n.id} />
                              <input type="hidden" name="category" value="conference_best_delegate" />
                              <button
                                type="submit"
                                className="text-xs px-2 py-1 rounded bg-brand-gold text-brand-navy font-medium"
                              >
                                Select as Best Delegate (overall)
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      <AwardsManagerClient
        conferences={conferences ?? []}
        assignments={(assignments ?? []) as AwardAssignment[]}
        profiles={profiles ?? []}
      />
    </MunPageShell>
  );
}
