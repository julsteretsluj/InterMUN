// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { RoleWorkspaceHome } from "@/components/workspace/RoleWorkspaceHome";
import { getCachedDashboardAuth } from "@/lib/dashboard-auth";
import { getConferenceForDashboardCached } from "@/lib/active-conference";
import {
  isAdminRole,
  isAdvisorRole,
  isChairRole,
  isSmtRole,
} from "@/lib/roles";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { homeTilesForRole } from "@/lib/workspace/role-home-tiles";
import { DASHBOARD_ROLE_HOME, dashboardHomeForRole } from "@/lib/workspace/role-homes";
import { isWorkspaceRole, type WorkspaceRole } from "@/lib/workspace/types";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";
import { getLocale, getTranslations } from "next-intl/server";

export default async function DashboardRoleHomePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: roleParam } = await params;
  const requested = roleParam?.toString().trim().toLowerCase();
  if (!isWorkspaceRole(requested)) {
    redirect("/dashboard");
  }

  const [auth, smtSurface, locale, tCommitteeLabels, tTopics] = await Promise.all([
    getCachedDashboardAuth(),
    getSmtDashboardSurface(),
    getLocale(),
    getTranslations("committeeNames.labels"),
    getTranslations("agendaTopics"),
  ]);

  const { user, profile } = auth;
  if (!user) redirect(`/login?next=${encodeURIComponent(DASHBOARD_ROLE_HOME[requested])}`);

  const profileRole = profile?.role?.toString().trim().toLowerCase();
  const effective = (effectiveDashboardRole(profileRole, isSmtRole(profileRole) ? smtSurface : null) ||
    profileRole) as string | undefined;

  const canView =
    requested === effective ||
    (isSmtRole(profileRole) && (requested === "smt" || requested === "chair" || requested === "delegate")) ||
    (isAdminRole(profileRole) && (requested === "admin" || requested === "smt")) ||
    (isChairRole(effective) && requested === "chair") ||
    (effective === "delegate" && requested === "delegate") ||
    (isAdvisorRole(profileRole) && requested === "advisor");

  if (!canView) {
    redirect(dashboardHomeForRole(effective || profileRole));
  }

  // Ops roles keep their dedicated app chrome for deep links; hub stays here as the map.
  if (requested === "advisor" || requested === "smt" || requested === "admin") {
    // Stay on this page — RoleWorkspaceHome links into /advisor, /smt, /admin trees.
  }

  let conferenceLine: string | null = null;
  if (requested === "delegate" || requested === "chair" || (isSmtRole(profileRole) && requested !== "smt")) {
    const activeConf = await getConferenceForDashboardCached(
      profileRole,
      user.id,
      isSmtRole(profileRole) ? smtSurface : null
    );
    if (activeConf) {
      const committee = activeConf.committee
        ? translateCommitteeLabel(tCommitteeLabels, activeConf.committee)
        : "";
      const topic = activeConf.name
        ? translateAgendaTopicLabel(tTopics, activeConf.name, locale)
        : "";
      conferenceLine = [committee, activeConf.tagline || topic].filter(Boolean).join(" · ") || null;
    }
  }

  return (
    <RoleWorkspaceHome
      role={requested as WorkspaceRole}
      tiles={homeTilesForRole(requested)}
      conferenceLine={conferenceLine}
    />
  );
}
