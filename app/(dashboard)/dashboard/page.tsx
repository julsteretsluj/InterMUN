// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { getCachedDashboardAuth } from "@/lib/dashboard-auth";
import { isSmtRole } from "@/lib/roles";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { dashboardHomeForRole } from "@/lib/workspace/role-homes";

export default async function DashboardIndexPage() {
  const [auth, smtSurface] = await Promise.all([
    getCachedDashboardAuth(),
    getSmtDashboardSurface(),
  ]);
  if (!auth.user) redirect("/login?next=/dashboard");

  const profileRole = auth.profile?.role?.toString().trim().toLowerCase();
  const effective = effectiveDashboardRole(
    profileRole,
    isSmtRole(profileRole) ? smtSurface : null
  );
  redirect(dashboardHomeForRole(effective || profileRole));
}
