import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { PageFeatureGuideLink } from "@/components/guides/PageFeatureGuideLink";
import { AmendmentsView } from "@/components/amendments/AmendmentsView";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getTranslations } from "next-intl/server";

export default async function AmendmentsPage() {
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
  const role = (profile?.role || "delegate").toString().toLowerCase();
  const isStaff = role === "chair" || role === "smt" || role === "admin";

  const conferenceId = await requireActiveConferenceId();

  const { data: resolutions } = await supabase
    .from("resolutions")
    .select("id, conference_id, google_docs_url, main_submitters, status")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });

  const resIds = (resolutions ?? []).map((r) => r.id);
  const { data: clauses } =
    resIds.length > 0
      ? await supabase
          .from("resolution_clauses")
          .select("id, resolution_id, clause_number, clause_text")
          .in("resolution_id", resIds)
          .order("clause_number", { ascending: true })
      : { data: [] };

  const { data: amendments } = await supabase
    .from("amendments")
    .select(
      "id, conference_id, resolution_id, submitted_by, delegate_country, delegate_email, amendment_type, target_clause_number, original_clause, proposed_clause, classification, status, reviewed_at, created_at"
    )
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false });

  const mainSubmitterResolutionIds = (resolutions ?? [])
    .filter((r) => Array.isArray(r.main_submitters) && r.main_submitters.includes(user.id))
    .map((r) => r.id);

  return (
    <MunPageShell
      variant="default"
      title={t("amendments")}
      titleAside={<PageFeatureGuideLink featureId="amendments" role={role} />}
    >
      <AmendmentsView
        conferenceId={conferenceId}
        userId={user.id}
        isStaff={isStaff}
        mainSubmitterResolutionIds={mainSubmitterResolutionIds}
        resolutions={(resolutions ?? []).map((r) => ({
          id: r.id,
          googleDocsUrl: r.google_docs_url,
          status: (r as { status?: string | null }).status ?? "draft",
        }))}
        clauses={(clauses ?? []) as {
          id: string;
          resolution_id: string;
          clause_number: number;
          clause_text: string;
        }[]}
        initialAmendments={(amendments ?? []) as never[]}
      />
    </MunPageShell>
  );
}
