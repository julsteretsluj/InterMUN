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

type CommitteeSortRow = { committee?: string | null; name?: string | null };

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
 * Locale sort puts "UN Women" before "UNESCO"/"UNSC" (space/punctuation vs letters).
 * Pin Intermediate UN-agency chambers to a stable order: UNESCO → UNODC → UNHRC → UNSC → UN Women.
 */
const EXPLICIT_LABEL_ORDER_AFTER_DIFFICULTY: Record<string, number> = {
  UNESCO: 10,
  UNODC: 11,
  UNHRC: 12,
  UNSC: 13,
  "UN WOMEN": 14,
  UNWOMEN: 14,
  // `committeeLookupKeys` uppercases; matches full names from committee labels / DB.
  "UNITED NATIONS SECURITY COUNCIL": 13,
  "UNITED NATIONS HUMAN RIGHTS COUNCIL": 12,
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
  const ar = explicitLabelOrderRank(a.committee);
  const br = explicitLabelOrderRank(b.committee);
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
  const aTags = resolveCommitteeDisplayTags(a.committee);
  const bTags = resolveCommitteeDisplayTags(b.committee);
  const d = difficultySortRank(aTags?.difficulty) - difficultySortRank(bTags?.difficulty);
  if (d !== 0) return d;
  const explicit = compareExplicitCommitteeLabelOrder(a, b);
  if (explicit !== null) return explicit;
  const ac = (a.committee ?? "").trim().toLowerCase() || (a.name ?? "").trim().toLowerCase();
  const bc = (b.committee ?? "").trim().toLowerCase() || (b.name ?? "").trim().toLowerCase();
  return ac.localeCompare(bc, undefined, { sensitivity: "base" });
}
