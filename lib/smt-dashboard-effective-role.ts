import type { UserRole } from "@/types/database";
import type { SmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";

/**
 * UI / routing role for the main app shell when an SMT user switches committee surfaces.
 * Database `profiles.role` stays `smt` for RLS.
 */
export function effectiveDashboardRole(
  profileRole: UserRole | string | null | undefined,
  smtSurface: SmtDashboardSurface | null
): UserRole | string | null | undefined {
  const r = profileRole?.toString().trim().toLowerCase();
  if (r !== "smt" || !smtSurface || smtSurface === "secretariat") return profileRole ?? null;
  if (smtSurface === "chair") return "chair";
  if (smtSurface === "delegate") return "delegate";
  return profileRole ?? null;
}
