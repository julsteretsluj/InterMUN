import { createClient } from "@/lib/supabase/server";
import { ResolutionsView } from "@/components/resolutions/ResolutionsView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { listClauseOutcomesAction } from "@/app/actions/resolutions";

export default async function ResolutionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canCreate = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const conferenceId = await requireActiveConferenceId();

  const { data: initialResolutions } = await supabase
    .from("resolutions")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false });
  let resolutions = initialResolutions ?? [];

  // Committees should start with two draft resolutions; chairs/staff can add a third.
  if (canCreate && resolutions.length < 2) {
    const missing = 2 - resolutions.length;
    const createdIds: string[] = [];
    for (let i = 0; i < missing; i += 1) {
      const { data: created } = await supabase
        .from("resolutions")
        .insert({
          conference_id: conferenceId,
          google_docs_url: null,
          main_submitters: [user.id],
          co_submitters: [],
          signatories: [],
        })
        .select("id")
        .single();
      if (created?.id) createdIds.push(created.id as string);
    }
    if (createdIds.length > 0) {
      await supabase.from("blocs").insert(
        createdIds.flatMap((resolutionId) => [
          { resolution_id: resolutionId, name: "A", stance: "for" },
          { resolution_id: resolutionId, name: "B", stance: "against" },
        ])
      );
      const { data: afterBootstrap } = await supabase
        .from("resolutions")
        .select("*")
        .eq("conference_id", conferenceId)
        .order("created_at", { ascending: false });
      resolutions = afterBootstrap ?? resolutions;
    }
  }

  const resList = resolutions;
  const resIds = resList.map((r) => r.id);
  const { data: blocs } =
    resIds.length > 0
      ? await supabase
          .from("blocs")
          .select("*, bloc_memberships(*)")
          .in("resolution_id", resIds)
      : { data: [] };

  const { data: clauses } =
    resIds.length > 0
      ? await supabase
          .from("resolution_clauses")
          .select("id, resolution_id, clause_number, clause_text, updated_at")
          .in("resolution_id", resIds)
          .order("clause_number", { ascending: true })
      : { data: [] };

  const clauseIds = (clauses ?? []).map((c) => c.id);
  const outcomesResult =
    clauseIds.length > 0
      ? await listClauseOutcomesAction({ clauseIds })
      : { ok: true as const, data: [] as Array<{
          id: string;
          vote_item_id: string;
          resolution_id: string;
          clause_id: string;
          passed: boolean;
          applied_at: string;
        }> };
  const clauseOutcomes = outcomesResult.ok ? outcomesResult.data : [];

  return (
    <MunPageShell title="Resolutions">
      <ResolutionsView
        resolutions={resolutions}
        blocs={blocs || []}
        clauses={
          (clauses ?? []) as Array<{
            id: string;
            resolution_id: string;
            clause_number: number;
            clause_text: string;
            updated_at: string;
          }>
        }
        clauseOutcomes={
          (clauseOutcomes ?? []) as Array<{
            id: string;
            vote_item_id: string;
            resolution_id: string;
            clause_id: string;
            passed: boolean;
            applied_at: string;
          }>
        }
        conferenceId={conferenceId}
        canCreate={canCreate}
      />
    </MunPageShell>
  );
}
