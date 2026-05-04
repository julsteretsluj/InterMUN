import { committeeSessionGroupKey } from "@/lib/committee-session-group";

/** Shared chair inboxes for SEAMUN I 2027 committees (delegate reference). */
export type SeamunChairContactRow = {
  committeeLabel: string;
  email: string;
  /** Match `committeeSessionGroupKey(conferences.committee)` (uppercase). */
  chamberKeys: readonly string[];
};

export const SEAMUN_I_2027_DELEGATE_CHAIR_CONTACTS: readonly SeamunChairContactRow[] = [
  { committeeLabel: "ECOSOC", email: "chairs@ecosoc.seamun.com", chamberKeys: ["ECOSOC"] },
  { committeeLabel: "F1", email: "chairs@f1.seamun.com", chamberKeys: ["F1"] },
  { committeeLabel: "EU Parli", email: "chairs@euparli.seamun.com", chamberKeys: ["EU PARLI"] },
  { committeeLabel: "UNICEF", email: "chairs@unicef.seamun.com", chamberKeys: ["UNICEF"] },
  { committeeLabel: "UNESCO", email: "chairs@unesco.seamun.com", chamberKeys: ["UNESCO"] },
  { committeeLabel: "UNHRC", email: "chairs@unhrc.seamun.com", chamberKeys: ["UNHRC"] },
  { committeeLabel: "UNODC", email: "chairs@unodc.seamun.com", chamberKeys: ["UNODC"] },
  { committeeLabel: "UN Women", email: "chairs@unwomen.seamun.com", chamberKeys: ["UN WOMEN"] },
  { committeeLabel: "UNSC", email: "chairs@unsc.seamun.com", chamberKeys: ["UNSC"] },
  { committeeLabel: "FWC", email: "chairs@fwc.seamun.com", chamberKeys: ["FWC"] },
  { committeeLabel: "DISEC", email: "chairs@disec.seamun.com", chamberKeys: ["DISEC"] },
  { committeeLabel: "HSC", email: "chairs@hsc.seamun.com", chamberKeys: ["HSC"] },
  { committeeLabel: "WHO", email: "chairs@who.seamun.com", chamberKeys: ["WHO"] },
  { committeeLabel: "Interpol", email: "chairs@interpol.seamun.com", chamberKeys: ["INTERPOL"] },
  { committeeLabel: "Press Corps", email: "chairs@presscorps.seamun.com", chamberKeys: ["PRESS CORPS"] },
];

export function seamunChairContactMatchesCommittee(
  row: SeamunChairContactRow,
  committee: string | null | undefined
): boolean {
  const k = committeeSessionGroupKey(committee);
  if (!k) return false;
  return row.chamberKeys.includes(k);
}
