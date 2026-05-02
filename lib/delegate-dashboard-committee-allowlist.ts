/**
 * Delegates normally switch dashboard committee only when they have an allocation row
 * for the target conference. A small allowlist can switch like chairs (any session in the
 * active event) for ops/testing — see setProfileDashboardCommittee.
 *
 * Optional env: DELEGATE_DASHBOARD_COMMITTEE_ALLOWLIST — comma-separated emails (lowercased when matched).
 */
const BUILTIN_ALLOWLIST = ["980165@verso.ac.th"] as const;

let cachedAllowlist: Set<string> | null = null;

function buildAllowlist(): Set<string> {
  const set = new Set<string>();
  for (const e of BUILTIN_ALLOWLIST) {
    set.add(e.trim().toLowerCase());
  }
  const extra = process.env.DELEGATE_DASHBOARD_COMMITTEE_ALLOWLIST?.split(",") ?? [];
  for (const raw of extra) {
    const t = raw.trim().toLowerCase();
    if (t) set.add(t);
  }
  return set;
}

export function isDelegateDashboardCommitteeAllowlistedEmail(
  email: string | null | undefined
): boolean {
  if (!email?.trim()) return false;
  if (!cachedAllowlist) cachedAllowlist = buildAllowlist();
  return cachedAllowlist.has(email.trim().toLowerCase());
}
