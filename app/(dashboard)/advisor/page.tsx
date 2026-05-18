import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { isAdvisorRole } from "@/lib/roles";
import { fetchAdvisorAssignmentsForAdvisor } from "@/lib/advisor-access";
import { AdvisorOversightPanel } from "@/components/advisor/AdvisorOversightPanel";
import { getTranslations } from "next-intl/server";

export default async function AdvisorDashboardPage() {
  const t = await getTranslations("pageTitles");
  const ta = await getTranslations("advisorDashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isAdvisorRole(profile?.role)) redirect("/profile");

  await requireActiveConferenceId();
  const assignments = await fetchAdvisorAssignmentsForAdvisor(supabase, user.id);

  return (
    <MunPageShell title={t("advisorDashboard")}>
      <div className="space-y-4">
        <p className="max-w-2xl text-sm text-brand-muted">{ta("intro")}</p>
        {assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-navy/15 bg-brand-cream/30 px-4 py-6 text-sm text-brand-muted">
            {ta("noAssignments")}
          </p>
        ) : (
          <AdvisorOversightPanel assignments={assignments} />
        )}
      </div>
    </MunPageShell>
  );
}
