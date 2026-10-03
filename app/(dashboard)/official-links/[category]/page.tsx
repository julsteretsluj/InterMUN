// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { MunPageShell } from "@/components/MunPageShell";
import { OfficialLinksCategoryLibrary } from "@/components/OfficialLinksCategoryLibrary";
import { SeamunConferenceLinksCta } from "@/components/SeamunConferenceLinksCta";
import { getConferenceForDashboardCached } from "@/lib/active-conference";
import { getCachedDashboardAuth } from "@/lib/dashboard-auth";
import { resolveOfficialLinkCategory } from "@/lib/official-un-links";
import { isSmtRole } from "@/lib/roles";
import { resolveSeamunConferenceLinks } from "@/lib/seamun-conference-links";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import type { UserRole } from "@/types/database";
import { getTranslations } from "next-intl/server";

export default async function OfficialLinksCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryId } = await params;

  const [t, tTitles, auth, smtSurfaceCookie] = await Promise.all([
    getTranslations("officialLinks"),
    getTranslations("pageTitles"),
    getCachedDashboardAuth(),
    getSmtDashboardSurface(),
  ]);
  const { user, profile } = auth;
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

  const seamunLinks = resolveSeamunConferenceLinks({
    role: effectiveRole,
    committee: activeConf?.committee ?? null,
  });

  const category = resolveOfficialLinkCategory(categoryId, {
    committeeSiteUrl: seamunLinks.committeeSiteUrl,
  });
  if (!category) redirect("/official-links");

  const categoryTitle = t(`groups.${category.labelKey}`);
  const title = category.emoji ? `${category.emoji} ${categoryTitle}` : categoryTitle;

  return (
    <MunPageShell
      title={title}
      variant="offset"
      titleAside={
        <span className="text-xs font-medium uppercase tracking-[0.06em] text-brand-muted">
          {tTitles("officialUnLinks")}
        </span>
      }
    >
      {category.id === "seamun" ? (
        <SeamunConferenceLinksCta
          committeeSiteUrl={seamunLinks.committeeSiteUrl}
          className="mb-6"
          compact
        />
      ) : null}
      <OfficialLinksCategoryLibrary category={category} />
    </MunPageShell>
  );
}
