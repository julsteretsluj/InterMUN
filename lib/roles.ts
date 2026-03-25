import type { UserRole } from "@/types/database";

/** Post-login home for website/platform admins (create events, manage SMT). */
export const ADMIN_APP_HOME = "/admin";

/** Post-login and post-gate home for secretariat accounts. */
export const SMT_APP_HOME = "/smt";

export function isChairRole(role: string | null | undefined): role is "chair" {
  const r = role?.toLowerCase();
  return r === "chair";
}

export function isSmtRole(role: string | null | undefined): role is "smt" {
  const r = role?.toLowerCase();
  return r === "smt";
}

/** Full platform operators (separate from conference SMT). */
export function isAdminRole(role: string | null | undefined): role is "admin" {
  const r = role?.toLowerCase();
  return r === "admin";
}

/** Can use the /smt secretariat dashboard (conference SMT or website admin). */
export function hasSmtDashboardAccess(role: string | null | undefined): boolean {
  const r = role?.toLowerCase();
  return r === "smt" || r === "admin";
}

/** Chair or SMT or admin: elevated staff nav tabs (capabilities differ). */
export function isStaffRole(role: string | null | undefined): boolean {
  const r = role?.toLowerCase();
  return r === "chair" || r === "smt" || r === "admin";
}

/** Dais controls: timer, floor bar, session floor nav — chairs only. */
export function showsDaisTools(role: UserRole | string | null | undefined): boolean {
  const r = role?.toString().toLowerCase();
  return r === "chair";
}

/**
 * SMT / admin may resolve the active committee without room/event cookies (oversight).
 * Chairs must use conference + committee codes when more than one committee exists.
 */
export function allowImplicitLatestConference(role: string | null | undefined): boolean {
  const r = role?.toLowerCase();
  return r === "smt" || r === "admin";
}

/** Creating a new conference event + first committee — secretariat or website admin. */
export function canCreateConferenceEvent(role: string | null | undefined): boolean {
  const r = role?.toLowerCase();
  return r === "smt" || r === "admin";
}

/** Open latest committee without codes — oversight shortcut for SMT/admin only. */
export function canUseLatestCommitteeShortcut(role: string | null | undefined): boolean {
  const r = role?.toLowerCase();
  return r === "smt" || r === "admin";
}
