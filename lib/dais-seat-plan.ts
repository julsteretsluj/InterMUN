import { committeeSessionGroupKey } from "@/lib/committee-session-group";

/** Default when chamber is unknown: Head Chair + Co-chair (matches legacy behaviour). */
const DEFAULT_PLAN = ["Head Chair", "Co-chair"] as const;

/**
 * Dais allocation labels (`allocations.country`) per chamber session group key
 * (`committeeSessionGroupKey`). Derived from SEAMUN I 2027 Delegate Allocation Matrix.
 */
const PLAN_BY_SESSION_GROUP: Record<string, readonly string[]> = {
  ECOSOC: ["Head Chair", "Co-chair"],
  /** Full committee title normalizes to PRESS CORPS */
  "PRESS CORPS": ["Head Editor", "Co-Editor"],
  F1: ["Head Chair", "Co-chair"],
  UNICEF: ["Head Chair", "Co-chair"],
  /** Matrix: three chairs — second Co-chair uses a distinct allocation label */
  "EU PARLI": ["Head Chair", "Co-chair", "Co-chair 2"],
  UNHRC: ["Head Chair", "Co-chair"],
  UNSC: ["Frontroom Chair", "Backroom Chair"],
  UNESCO: ["Head Chair", "Co-chair"],
  UNODC: ["Head Chair", "Co-chair"],
  "UN WOMEN": ["Head Chair", "Co-chair"],
  DISEC: ["Head Chair", "Co-chair"],
  /** Two frontroom + one backroom (matrix layout). */
  HSC: ["Frontroom Chair", "Frontroom Chair 2", "Backroom Chair"],
  WHO: ["Head Chair", "Co-chair"],
  FWC: ["Head Chair", "Co-chair"],
  INTERPOL: ["Head Chair", "Co-chair"],
};

/** When switching naming schemes, rename vacant legacy rows before inserting new labels. */
export const LEGACY_DAIS_RENAMES: Record<string, [fromLower: string, toExact: string][]> = {
  UNSC: [
    ["head chair", "Frontroom Chair"],
    ["co-chair", "Backroom Chair"],
    ["co chair", "Backroom Chair"],
  ],
  WHO: [
    ["frontroom chair", "Head Chair"],
    ["backroom chair", "Co-chair"],
  ],
  INTERPOL: [
    ["frontroom chair", "Head Chair"],
    ["backroom chair", "Co-chair"],
  ],
  "PRESS CORPS": [
    ["head chair", "Head Editor"],
    ["co-chair", "Co-Editor"],
    ["co chair", "Co-Editor"],
  ],
  HSC: [
    ["head chair", "Frontroom Chair"],
    ["co-chair", "Backroom Chair"],
    ["co chair", "Backroom Chair"],
  ],
};

const ALL_PLAN_LABELS_LOWER = new Set<string>();
for (const plan of Object.values(PLAN_BY_SESSION_GROUP)) {
  for (const l of plan) ALL_PLAN_LABELS_LOWER.add(l.trim().toLowerCase());
}
DEFAULT_PLAN.forEach((l) => ALL_PLAN_LABELS_LOWER.add(l.toLowerCase()));
["co chair", "backroom chair 2"].forEach((l) => ALL_PLAN_LABELS_LOWER.add(l));

/** Used to exclude dais rows from delegate placards when loading committee room. */
export function isDaisSeatAllocationCountry(raw: string | null | undefined): boolean {
  const label = String(raw ?? "").trim().toLowerCase();
  if (!label) return false;
  return ALL_PLAN_LABELS_LOWER.has(label);
}

export function getDaisSeatLabelsForCommittee(committee: string | null | undefined): readonly string[] {
  const g = committeeSessionGroupKey(committee);
  if (!g) return DEFAULT_PLAN;
  return PLAN_BY_SESSION_GROUP[g] ?? DEFAULT_PLAN;
}
