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
  const ac = (a.committee ?? "").trim().toLowerCase() || (a.name ?? "").trim().toLowerCase();
  const bc = (b.committee ?? "").trim().toLowerCase() || (b.name ?? "").trim().toLowerCase();
  return ac.localeCompare(bc, undefined, { sensitivity: "base" });
}
