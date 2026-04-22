const CHAIR_MULTI_COMMITTEE_TEST_EMAILS = new Set([
  "jules.ktoast@gmail.com",
]);

export function canChairSwitchAnyCommitteeForTesting(email: string | null | undefined): boolean {
  return CHAIR_MULTI_COMMITTEE_TEST_EMAILS.has((email ?? "").trim().toLowerCase());
}
