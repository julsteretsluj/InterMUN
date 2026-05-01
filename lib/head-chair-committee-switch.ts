/** Accounts allowed to set the active committee from profile (Head Chair seat holders). */
const HEAD_CHAIR_COMMITTEE_SWITCH_EMAILS = new Set(
  ["jules.ktoast@gmail.com"].map((e) => e.trim().toLowerCase())
);

export function canSwitchCommitteeViaProfile(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return HEAD_CHAIR_COMMITTEE_SWITCH_EMAILS.has(email.trim().toLowerCase());
}

export function isHeadChairAllocationLabel(country: string | null | undefined): boolean {
  return (country ?? "").trim().toLowerCase() === "head chair";
}
