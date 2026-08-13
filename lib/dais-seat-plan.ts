// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import {
  SEAMUN_I_2027_SMT_ALLOCATION_COUNTRY_LABELS,
  SMT_TEMPORARY_SEAT_LABELS,
} from "@/lib/seamun-i-2027-secretariat-roster";

/** Default when chamber is unknown: Head Chair + Co-chair (matches legacy behaviour). */
const DEFAULT_PLAN = ["Head Chair", "Co-chair"] as const;

/**
 * Dais allocation labels (`allocations.country`) per chamber session group key
 * (`committeeSessionGroupKey`). Derived from SEAMUN I 2027 Delegate Allocation Matrix.
 */
const PLAN_BY_SESSION_GROUP: Record<string, readonly string[]> = {
  /** Must stay in sync with SEAMUN_I_2027_SMT_ALLOCATION_COUNTRY_LABELS — full secretariat roster, no chair titles. */
  SMT: [...SEAMUN_I_2027_SMT_ALLOCATION_COUNTRY_LABELS],
};

const COMMITTEE_CHAIR_SEAT_LABELS_LOWER = new Set([
  "head chair",
  "co-chair",
  "co chair",
  "frontroom chair",
  "backroom chair",
  "head editor",
  "co-editor",
]);

/** When switching naming schemes, rename vacant legacy rows before inserting new labels. */
export const LEGACY_DAIS_RENAMES: Record<string, [fromLower: string, toExact: string][]> = {
  UNSC: [
    ["frontroom chair", "Head Chair"],
    ["backroom chair", "Co-chair"],
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
    ["head editor", "Head Chair"],
    ["co-editor", "Co-chair"],
  ],
  SMT: [
    ["head chair", "Secretary General"],
    ["co-chair", "Deputy Secretary General"],
    ["co chair", "Deputy Secretary General"],
  ],
};

const ALL_PLAN_LABELS_LOWER = new Set<string>();
for (const plan of Object.values(PLAN_BY_SESSION_GROUP)) {
  for (const l of plan) ALL_PLAN_LABELS_LOWER.add(l.trim().toLowerCase());
}
for (const l of SMT_TEMPORARY_SEAT_LABELS) {
  ALL_PLAN_LABELS_LOWER.add(l.trim().toLowerCase());
}
DEFAULT_PLAN.forEach((l) => ALL_PLAN_LABELS_LOWER.add(l.toLowerCase()));
[
  "co chair",
  "frontroom chair",
  "backroom chair",
  "backroom chair 2",
  "head editor",
  "co-editor",
].forEach((l) => ALL_PLAN_LABELS_LOWER.add(l));

/** Used to exclude dais rows from delegate placards when loading committee room. */
export function isDaisSeatAllocationCountry(raw: string | null | undefined): boolean {
  const label = String(raw ?? "").trim().toLowerCase();
  if (!label) return false;
  return ALL_PLAN_LABELS_LOWER.has(label);
}

/** Head Chair / Co-chair (and legacy aliases) — not the full SMT secretariat roster. */
export function isCommitteeChairSeatLabel(raw: string | null | undefined): boolean {
  const label = String(raw ?? "").trim().toLowerCase();
  if (!label) return false;
  return COMMITTEE_CHAIR_SEAT_LABELS_LOWER.has(label);
}

export function getDaisSeatLabelsForCommittee(committee: string | null | undefined): readonly string[] {
  const g = committeeSessionGroupKey(committee);
  if (!g) return DEFAULT_PLAN;
  /** Never fall back to DEFAULT_PLAN for SMT — that only seeds Head Chair / Co-chair. */
  if (g === "SMT") return [...SEAMUN_I_2027_SMT_ALLOCATION_COUNTRY_LABELS];
  return PLAN_BY_SESSION_GROUP[g] ?? DEFAULT_PLAN;
}
