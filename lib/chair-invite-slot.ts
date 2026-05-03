import { getDaisSeatLabelsForCommittee } from "@/lib/dais-seat-plan";

/** Form value: `{uuid}::{encodeURIComponent(exact seat label)}` */
export function parseChairInviteSelection(raw: unknown): { conferenceId: string; countryLabel: string } | null {
  const s = String(raw ?? "").trim();
  const sep = "::";
  const idx = s.indexOf(sep);
  if (idx < 0) return null;
  const conferenceId = s.slice(0, idx).trim();
  const encoded = s.slice(idx + sep.length);
  if (!/^[0-9a-f-]{36}$/i.test(conferenceId)) return null;
  try {
    const countryLabel = decodeURIComponent(encoded).trim();
    if (!countryLabel) return null;
    return { conferenceId, countryLabel };
  } catch {
    return null;
  }
}

export function countryLabelAllowedForCommittee(
  committee: string | null | undefined,
  countryLabel: string
): boolean {
  const plan = getDaisSeatLabelsForCommittee(committee);
  const c = countryLabel.trim().toLowerCase();
  return plan.some((l) => l.trim().toLowerCase() === c);
}

export function findAllocationRowForCountryLabel<
  T extends { id: string; country: string | null; user_id: string | null },
>(rows: T[], countryLabel: string): T | undefined {
  const target = countryLabel.trim().toLowerCase();
  return rows.find((r) => String(r.country ?? "").trim().toLowerCase() === target);
}
