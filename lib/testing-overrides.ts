/**
 * Optional dev / staging allowlist so a chair account can switch committee without a seat
 * on every chamber. Set `CHAIR_MULTI_COMMITTEE_TEST_EMAILS` to a comma-separated list of
 * lowercase auth emails (server env). Never commit real addresses here.
 */
function parseEmailAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

const allowFromEnv = parseEmailAllowlist(process.env.CHAIR_MULTI_COMMITTEE_TEST_EMAILS);

export function canChairSwitchAnyCommitteeForTesting(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  return allowFromEnv.has(e);
}
