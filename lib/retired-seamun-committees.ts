import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import { isEuParliamentProcedure } from "@/lib/procedure-profiles";

/**
 * Chambers removed from SEAMUN I 2027 — hide from SMT UI and exclude from new matrix seeds.
 * Match via session group key (first token before " - ") and common label variants.
 */
const RETIRED_SEAMUN_COMMITTEE_GROUP_KEYS = new Set([
  "EU",
  "EU PARLI",
  "EU PARLIAMENT",
  "EUROPEAN PARLIAMENT",
  "EUROPEAN UNION PARLIAMENT",
  "F1",
  "HSC",
  "UNESCO",
  "UNICEF",
]);

/** Exact `conferences.committee` values used in legacy seeds. */
export const RETIRED_SEAMUN_COMMITTEE_LABELS = [
  "EU Parli",
  "F1",
  "HSC",
  "UNESCO",
  "UNICEF",
] as const;

function isRetiredEuParliamentLabel(label: string): boolean {
  const upper = label.toUpperCase();
  if (upper.startsWith("EU PARLI")) return true;
  if (upper === "EU") return true;
  if (upper.startsWith("EU PARLIAMENT")) return true;
  if (upper.startsWith("EUROPEAN PARLIAMENT")) return true;
  if (upper.startsWith("EUROPEAN UNION PARLIAMENT")) return true;
  if (upper.includes("EU") && upper.includes("PARLI")) return true;
  return false;
}

export type RetiredSeamunCommitteeRowFields = {
  committee?: string | null;
  name?: string | null;
  committee_code?: string | null;
  committee_full_name?: string | null;
  room_code?: string | null;
  procedure_profile?: string | null;
};

export function isRetiredSeamunCommitteeRow(c: RetiredSeamunCommitteeRowFields): boolean {
  if (isEuParliamentProcedure(c.procedure_profile)) return true;

  const roomCode = c.room_code?.trim().toUpperCase() ?? "";
  if (roomCode.startsWith("EUP")) return true;

  const fullName = c.committee_full_name?.trim() ?? "";
  if (fullName && isRetiredEuParliamentLabel(fullName)) return true;

  const groupKey = committeeSessionGroupKey(c.committee);
  if (groupKey && RETIRED_SEAMUN_COMMITTEE_GROUP_KEYS.has(groupKey)) {
    return true;
  }

  const label = c.committee?.trim() ?? "";
  if (label) {
    if (isRetiredEuParliamentLabel(label)) return true;
    if (
      RETIRED_SEAMUN_COMMITTEE_LABELS.some(
        (retired) => retired.toUpperCase() === label.toUpperCase()
      )
    ) {
      return true;
    }
  }

  const code = c.committee_code?.trim().toUpperCase() ?? "";
  if (code.startsWith("EUP")) return true;

  const sessionName = c.name?.trim() ?? "";
  if (sessionName) {
    const nameKey = committeeSessionGroupKey(sessionName);
    if (nameKey && RETIRED_SEAMUN_COMMITTEE_GROUP_KEYS.has(nameKey)) return true;
    if (isRetiredEuParliamentLabel(sessionName)) return true;
  }

  return false;
}

export function filterActiveSeamunCommitteeRows<T extends RetiredSeamunCommitteeRowFields>(
  rows: T[]
): T[] {
  return rows.filter((c) => !isRetiredSeamunCommitteeRow(c));
}

/** Drop retired chambers from committee pickers (notes, awards, etc.). */
export function filterCanonicalCommitteeOptions<
  T extends { id: string; label: string },
  R extends RetiredSeamunCommitteeRowFields & { id: string },
>(committees: T[], sourceRows?: R[]): T[] {
  const rowById = sourceRows ? new Map(sourceRows.map((r) => [r.id, r])) : null;

  return committees.filter((c) => {
    const row = rowById?.get(c.id);
    if (row && isRetiredSeamunCommitteeRow(row)) return false;
    return !isRetiredSeamunCommitteeRow({ committee: c.label });
  });
}
