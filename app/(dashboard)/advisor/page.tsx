import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SEAMUN_I_2027_EVENT_CODE } from "@/lib/seamun-i-2027-secretariat-roster";
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

  const conferenceId = await requireActiveConferenceId();
  const { data: conf } = await supabase
    .from("conferences")
    .select("event_id")
    .eq("id", conferenceId)
    .maybeSingle();
  const { data: eventRow } = conf?.event_id
    ? await supabase.from("conference_events").select("event_code").eq("id", conf.event_id).maybeSingle()
    : { data: null as { event_code: string } | null };
  const showSchedule =
    (eventRow?.event_code ?? "").trim().toUpperCase() === SEAMUN_I_2027_EVENT_CODE;

  const assignments = await fetchAdvisorAssignmentsForAdvisor(supabase, user.id);

  return (
    <MunPageShell title={t("advisorDashboard")}>
      <div className="space-y-4">
        <p className="max-w-2xl text-sm text-brand-muted">{ta("intro")}</p>
        {showSchedule ? (
          <Link
            href="/advisor/schedule"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-brand-accent/35 bg-brand-accent/10 px-4 py-2.5 text-sm font-semibold text-brand-navy transition-apple hover:bg-brand-accent/15"
          >
            <span aria-hidden>📅</span>
            {t("advisorSchedule")}
          </Link>
        ) : null}
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
