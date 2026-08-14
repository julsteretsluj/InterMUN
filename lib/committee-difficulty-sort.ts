// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { resolveCommitteeDisplayTags } from "@/lib/committee-card-display";

/** Beginner → Intermediate → Advanced; unknown / unmapped → last. */
export function difficultySortRank(
  level: "Beginner" | "Intermediate" | "Advanced" | null | undefined
): number {
  if (level === "Beginner") return 0;
  if (level === "Intermediate") return 1;
  if (level === "Advanced") return 2;
  return 99;
}

type CommitteeSortRow = {
  committee?: string | null;
  /** Alias for `committee` when the row uses a display `label` field. */
  label?: string | null;
  name?: string | null;
};

function chamberLabel(row: CommitteeSortRow): string | null | undefined {
  return row.committee ?? row.label;
}

/** Mirrors `acronymLookupKey` in committee-card-display for label tie-breaks only. */
function committeeLookupKeys(committee: string): string[] {
  const t = committee.trim();
  if (!t) return [];
  const upper = t.toUpperCase();
  const firstToken = t.split(/\s*-\s*/)[0]?.trim().toUpperCase() ?? upper;
  const noParen = upper.replace(/\([^)]*\)/g, "").trim();
  return [upper, firstToken, noParen];
}

/**
 * Locale sort puts "UN Women" before "UNSC" (space/punctuation vs letters).
 * Pin Intermediate UN-agency chambers to a stable order: UNHRC → UNODC → UNSC → UN Women.
 */
const EXPLICIT_LABEL_ORDER_AFTER_DIFFICULTY: Record<string, number> = {
  UNHRC: 10,
  UNODC: 11,
  UNSC: 12,
  "UN WOMEN": 13,
  UNWOMEN: 13,
  // `committeeLookupKeys` uppercases; matches full names from committee labels / DB.
  "UNITED NATIONS SECURITY COUNCIL": 12,
  "UNITED NATIONS HUMAN RIGHTS COUNCIL": 10,
  "UNITED NATIONS OFFICE ON DRUGS AND CRIME": 11,
};

function explicitLabelOrderRank(committee: string | null | undefined): number | undefined {
  const c = committee?.trim();
  if (!c) return undefined;
  for (const key of committeeLookupKeys(c)) {
    const rank = EXPLICIT_LABEL_ORDER_AFTER_DIFFICULTY[key];
    if (rank !== undefined) return rank;
  }
  return undefined;
}

/**
 * When both rows use an explicitly ordered label pair (e.g. UNSC vs UN Women), returns
 * their relative order; otherwise `null` so callers can fall back to locale sort.
 */
export function compareExplicitCommitteeLabelOrder(
  a: CommitteeSortRow,
  b: CommitteeSortRow
): number | null {
  const ar = explicitLabelOrderRank(chamberLabel(a));
  const br = explicitLabelOrderRank(chamberLabel(b));
  if (ar !== undefined && br !== undefined && ar !== br) return ar - br;
  return null;
}

/**
 * Same ordering as the SMT overview grid: difficulty (well-known chambers), then
 * alphabetical by committee label (fallback: session title when committee is empty).
 */
export function compareCommitteeRowsByDifficultyThenLabel(
  a: CommitteeSortRow,
  b: CommitteeSortRow
): number {
  const aChamber = chamberLabel(a);
  const bChamber = chamberLabel(b);
  const aTags = resolveCommitteeDisplayTags(aChamber);
  const bTags = resolveCommitteeDisplayTags(bChamber);
  const d = difficultySortRank(aTags?.difficulty) - difficultySortRank(bTags?.difficulty);
  if (d !== 0) return d;
  const explicit = compareExplicitCommitteeLabelOrder(a, b);
  if (explicit !== null) return explicit;
  const ac = (aChamber ?? "").trim().toLowerCase() || (a.name ?? "").trim().toLowerCase();
  const bc = (bChamber ?? "").trim().toLowerCase() || (b.name ?? "").trim().toLowerCase();
  return ac.localeCompare(bc, undefined, { sensitivity: "base" });
}

/** Sort chamber label strings with the shared difficulty → label order. */
export function sortCommitteeLabelsByDifficultyThenAlpha(labels: readonly string[]): string[] {
  return [...labels].sort((a, b) =>
    compareCommitteeRowsByDifficultyThenLabel({ committee: a }, { committee: b })
  );
}
