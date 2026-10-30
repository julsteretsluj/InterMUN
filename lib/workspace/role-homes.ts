// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { WorkspaceRole } from "@/lib/workspace/types";
import { isWorkspaceRole } from "@/lib/workspace/types";

/**
 * Canonical role workspace homes under `/dashboard/[role]`.
 * Legacy flat routes (`/delegate`, `/chair`, `/smt`, …) remain as compatibility aliases.
 */
export const DASHBOARD_ROLE_HOME: Record<WorkspaceRole, string> = {
  delegate: "/dashboard/delegate",
  chair: "/dashboard/chair",
  advisor: "/dashboard/advisor",
  smt: "/dashboard/smt",
  admin: "/dashboard/admin",
};

/** Existing feature hubs still used as implementation targets / deep links. */
export const LEGACY_ROLE_HOME: Record<WorkspaceRole, string> = {
  delegate: "/delegate",
  chair: "/chair",
  advisor: "/advisor",
  smt: "/smt",
  admin: "/admin",
};

export function dashboardHomeForRole(role: string | null | undefined): string {
  const normalized = role?.toString().trim().toLowerCase();
  if (isWorkspaceRole(normalized)) return DASHBOARD_ROLE_HOME[normalized];
  return DASHBOARD_ROLE_HOME.delegate;
}

export function legacyHomeForRole(role: string | null | undefined): string {
  const normalized = role?.toString().trim().toLowerCase();
  if (isWorkspaceRole(normalized)) return LEGACY_ROLE_HOME[normalized];
  return LEGACY_ROLE_HOME.delegate;
}

/** Map a `/dashboard/[role]` segment or legacy path prefix to a workspace role. */
export function workspaceRoleFromPathname(pathname: string): WorkspaceRole | null {
  const path = pathname.split("?")[0] || "/";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    const segment = path.split("/")[2];
    if (isWorkspaceRole(segment)) return segment;
    return null;
  }
  if (path === "/delegate" || path.startsWith("/delegate/")) return "delegate";
  if (path === "/chair" || path.startsWith("/chair/")) return "chair";
  if (path === "/advisor" || path.startsWith("/advisor/")) return "advisor";
  if (path === "/smt" || path.startsWith("/smt/")) return "smt";
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  return null;
}
