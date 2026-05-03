/** Canonical labels for dais seats (matches SMT quick-add and committee-room payload). */
export const DAIS_SEAT_HEAD_CHAIR = "Head Chair";
export const DAIS_SEAT_CO_CHAIR = "Co-chair";

/**
 * Sort rank for allocation matrix / staff views: primary dais roles first, then secondary,
 * then delegates (large rank).
 */
export function daisSeatSortRank(country: string): number {
  const k = country.trim().toLowerCase();
  if (k === "frontroom chair" || k === "head chair" || k === "head editor") return 0;
  if (k === "backroom chair" || k === "co-chair" || k === "co chair" || k === "co-editor") return 1;
  if (k === "co-chair 2" || k === "backroom chair 2") return 2;
  if (k === "rapporteur") return 3;
  return 100;
}

export function compareAllocationCountryDisplay(a: string, b: string): number {
  const ra = daisSeatSortRank(a);
  const rb = daisSeatSortRank(b);
  if (ra !== rb) return ra - rb;
  return a.trim().localeCompare(b.trim(), undefined, { sensitivity: "base" });
}

export function sortAllocationsByDisplayCountry<T extends { country: string }>(items: T[]): T[] {
  return [...items].sort((x, y) => compareAllocationCountryDisplay(x.country, y.country));
}

export function sortCountryLabelsForDisplay(labels: string[]): string[] {
  return [...labels].sort(compareAllocationCountryDisplay);
}

export function sortRowsByAllocationCountry<T extends { country?: string | null }>(items: T[]): T[] {
  return [...items].sort((x, y) =>
    compareAllocationCountryDisplay(String(x.country ?? ""), String(y.country ?? ""))
  );
}
