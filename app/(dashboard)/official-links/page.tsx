import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { OfficialLinksPanel } from "@/components/OfficialLinksPanel";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { resolveSeamunConferenceLinks } from "@/lib/seamun-conference-links";
import { isSmtRole } from "@/lib/roles";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import type { UserRole } from "@/types/database";
import { getTranslations } from "next-intl/server";

export default async function OfficialLinksPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const normalizedRole = profile?.role
    ? (profile.role.toString().trim().toLowerCase() as UserRole)
    : undefined;
  const smtSurface = isSmtRole(normalizedRole) ? await getSmtDashboardSurface() : null;
  const effectiveRole = effectiveDashboardRole(normalizedRole, smtSurface) ?? normalizedRole;

  const activeConf = await getConferenceForDashboard({
    role: normalizedRole,
    userId: user.id,
    smtDashboardSurface: isSmtRole(normalizedRole) ? smtSurface : null,
  });

  const links = resolveSeamunConferenceLinks({
    role: effectiveRole,
    committee: activeConf?.committee ?? null,
  });

  return (
    <MunPageShell title={t("officialUnLinks")} variant="default">
      <OfficialLinksPanel committeeSiteUrl={links.committeeSiteUrl} />
    </MunPageShell>
  );
}
