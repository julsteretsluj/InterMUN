import type { DaisSeat, DelegatePlacard } from "@/components/committee-room/VirtualCommitteeRoom";

export function normalizeDelegationSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True when `q` is empty (show everything at full emphasis). */
export function delegatePlacardMatchesSearch(p: DelegatePlacard, qNormalized: string): boolean {
  if (!qNormalized) return true;
  const parts = [p.country, p.name, p.school, p.pronouns].map((s) => (s ?? "").toLowerCase());
  if (p.vacant) {
    return "vacant".includes(qNormalized) || parts.some((x) => x.includes(qNormalized));
  }
  return parts.some((x) => x.includes(qNormalized));
}

export function daisSeatMatchesSearch(s: DaisSeat, qNormalized: string): boolean {
  if (!qNormalized) return true;
  return `${s.title} ${s.name ?? ""}`.toLowerCase().includes(qNormalized);
}

export function countDelegatePlacardMatches(placards: DelegatePlacard[], qNormalized: string): number {
  if (!qNormalized) return placards.length;
  return placards.filter((p) => delegatePlacardMatchesSearch(p, qNormalized)).length;
}
