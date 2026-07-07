import { createClient } from "@/lib/supabase/server";
import { ResolutionsView } from "@/components/resolutions/ResolutionsView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getChamberScope } from "@/lib/chamber-scope";
import { getTranslations } from "next-intl/server";

export default async function ResolutionsPage() {
  const t = await getTranslations("pageTitles");
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
  const scope = await getChamberScope(supabase, conferenceId);

  const { data: procedureState } = await supabase
    .from("procedure_states")
    .select("committee_session_started_at")
    .eq("conference_id", scope.canonicalConferenceId)
    .maybeSingle();
  const sessionActive = Boolean(
    (procedureState as { committee_session_started_at?: string | null } | null)?.committee_session_started_at
  );

  const { data: allocations } = await supabase
    .from("allocations")
    .select("id, country, user_id")
    .eq("conference_id", conferenceId);

  const myAllocation =
    allocations?.find((row) => row.user_id === user.id) ?? null;

  const { data: initialResolutions } = await supabase
    .from("resolutions")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false });
  const resolutions = initialResolutions ?? [];

  const resIds = resolutions.map((r) => r.id);
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

  return (
    <MunPageShell title={t("resolutions")}>
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
        conferenceId={conferenceId}
        canCreate={canCreate}
        currentUserId={user.id}
        myAllocationId={myAllocation?.id ?? null}
        allocations={(allocations ?? []).map((row) => ({
          id: row.id,
          country: row.country,
          user_id: row.user_id,
        }))}
        sessionActive={sessionActive}
      />
    </MunPageShell>
  );
}
