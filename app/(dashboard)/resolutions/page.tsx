import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ResolutionsView } from "@/components/resolutions/ResolutionsView";
import { MunPageShell } from "@/components/MunPageShell";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getChamberScope } from "@/lib/chamber-scope";
import { fetchScorableDelegatesForCommittee } from "@/lib/seated-delegates-for-awards";
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
  const chamber = await getChamberScope(supabase, conferenceId);

  const { data: initialResolutions } = await supabase
    .from("resolutions")
    .select("*")
    .in("conference_id", chamber.siblingConferenceIds)
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

  const delegates = await fetchScorableDelegatesForCommittee(supabase, chamber.siblingConferenceIds);

  return (
    <MunPageShell
      variant="split"
      title={t("resolutions")}
      titleAside={<PageFeatureGuideLink featureId="resolutions" role={myRole} />}
    >
      <Suspense fallback={null}>
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
        delegates={delegates}
      />
      </Suspense>
    </MunPageShell>
  );
}
