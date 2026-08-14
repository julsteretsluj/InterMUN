// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { OfficialLinksCategoryLibrary } from "@/components/OfficialLinksCategoryLibrary";
import { SeamunConferenceLinksCta } from "@/components/SeamunConferenceLinksCta";
import { getConferenceForDashboard } from "@/lib/active-conference";
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

  const t = await getTranslations("officialLinks");
  const tTitles = await getTranslations("pageTitles");
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
