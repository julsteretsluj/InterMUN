import { redirect } from "next/navigation";
import { MunPageShell } from "@/components/MunPageShell";
import { OfficialLinksPanel } from "@/components/OfficialLinksPanel";
import { getConferenceForDashboardCached } from "@/lib/active-conference";
import { getCachedDashboardAuth } from "@/lib/dashboard-auth";
import { resolveSeamunConferenceLinks } from "@/lib/seamun-conference-links";
import { isSmtRole } from "@/lib/roles";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import type { UserRole } from "@/types/database";
import { getTranslations } from "next-intl/server";

export default async function OfficialLinksPage() {
  const t = await getTranslations("pageTitles");
  const [{ user, profile }, smtSurfaceCookie] = await Promise.all([
    getCachedDashboardAuth(),
    getSmtDashboardSurface(),
  ]);
  if (!user) redirect("/login");

  const normalizedRole = profile?.role
    ? (profile.role.toString().trim().toLowerCase() as UserRole)
    : undefined;
  const smtSurface = isSmtRole(normalizedRole) ? smtSurfaceCookie : null;
  const effectiveRole = effectiveDashboardRole(normalizedRole, smtSurface) ?? normalizedRole;

  const activeConf = await getConferenceForDashboardCached(
    normalizedRole,
    user.id,
    isSmtRole(normalizedRole) ? smtSurface : null
  );

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
