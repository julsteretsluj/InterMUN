import { committeeSessionGroupKey } from "@/lib/committee-session-group";

/**
 * Placeholder chair inboxes for committee labels (RFC 2606 `example.org`).
 * Configure real addresses in a private deployment or replace this module locally.
 */
export type SeamunChairContactRow = {
  committeeLabel: string;
  email: string;
  /** Match `committeeSessionGroupKey(conferences.committee)` (uppercase). */
  chamberKeys: readonly string[];
};

export const SEAMUN_I_2027_DELEGATE_CHAIR_CONTACTS: readonly SeamunChairContactRow[] = [
  { committeeLabel: "ECOSOC", email: "chairs-ecosoc@example.org", chamberKeys: ["ECOSOC"] },
  { committeeLabel: "UNHRC", email: "chairs-unhrc@example.org", chamberKeys: ["UNHRC"] },
  { committeeLabel: "UNODC", email: "chairs-unodc@example.org", chamberKeys: ["UNODC"] },
  { committeeLabel: "UN Women", email: "chairs-unwomen@example.org", chamberKeys: ["UN WOMEN"] },
  { committeeLabel: "UNSC", email: "chairs-unsc@example.org", chamberKeys: ["UNSC"] },
  { committeeLabel: "FWC", email: "chairs-fwc@example.org", chamberKeys: ["FWC"] },
  { committeeLabel: "DISEC", email: "chairs-disec@example.org", chamberKeys: ["DISEC"] },
  { committeeLabel: "WHO", email: "chairs-who@example.org", chamberKeys: ["WHO"] },
  { committeeLabel: "Interpol", email: "chairs-interpol@example.org", chamberKeys: ["INTERPOL"] },
  { committeeLabel: "Press Corps", email: "chairs-presscorps@example.org", chamberKeys: ["PRESS CORPS"] },
];

export function seamunChairContactMatchesCommittee(
  row: SeamunChairContactRow,
  committee: string | null | undefined
): boolean {
  const k = committeeSessionGroupKey(committee);
  if (!k) return false;
  return row.chamberKeys.includes(k);
}
