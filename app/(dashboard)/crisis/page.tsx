import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { buildCrisisNotesPack } from "@/lib/crisis-notes-prompts";
import { CrisisNotesPromptsView } from "@/components/crisis/CrisisNotesPromptsView";
import { getTranslations } from "next-intl/server";

export default async function CrisisPage() {
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
  if (!profile?.role) redirect("/login");

  const myRole = profile.role.toString().toLowerCase();
  const smtSurface = myRole === "smt" ? await getSmtDashboardSurface() : null;
  const effectiveRole = String(
    effectiveDashboardRole(myRole, smtSurface) ?? myRole
  ).toLowerCase();
  const activeConf = await resolveDashboardConferenceForUser(profile.role, user.id);
  if (!activeConf || !isCrisisCommittee(activeConf.committee)) {
    if (effectiveRole === "chair") redirect("/chair");
    if (myRole === "smt" || myRole === "admin") redirect("/smt");
    redirect("/delegate");
  }

  const { data: allocationRows } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", activeConf.id)
    .order("country", { ascending: true });

  const seats = (allocationRows ?? [])
    .map((row) => (typeof row.country === "string" ? row.country.trim() : ""))
    .filter(Boolean);

  const pack = buildCrisisNotesPack({
    committee: activeConf.committee,
    topicName: activeConf.name,
    tagline: activeConf.tagline,
    seats,
  });

  return (
    <MunPageShell title={t("crisis")} variant="offset">
      <CrisisNotesPromptsView pack={pack} />
    </MunPageShell>
  );
}
