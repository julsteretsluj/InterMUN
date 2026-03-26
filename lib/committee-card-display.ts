import { createHash } from "node:crypto";

/** Known chamber labels → full name when `committee_full_name` is not set in DB. */
const WELL_KNOWN_COMMITTEE_FULL_NAME: Record<string, string> = {
  DISEC: "Disarmament and International Security Committee",
  ECOSOC: "Economic and Social Council",
  WHO: "World Health Organization",
  UNSC: "United Nations Security Council",
  UNHRC: "United Nations Human Rights Council",
  UNODC: "United Nations Office on Drugs and Crime",
  "UN WOMEN": "UN Women",
  UNWOMEN: "UN Women",
  INTERPOL: "INTERPOL",
  "PRESS CORPS": "Press Corps",
  PRESSCORPS: "Press Corps",
};

function acronymLookupKey(committee: string): string[] {
  const t = committee.trim();
  if (!t) return [];
  const upper = t.toUpperCase();
  const firstToken = t.split(/\s*-\s*/)[0]?.trim().toUpperCase() ?? upper;
  return [upper, firstToken];
}

export function resolveCommitteeFullName(
  committeeFullName: string | null | undefined,
  committee: string | null | undefined
): string | null {
  const fromDb = committeeFullName?.trim();
  if (fromDb) return fromDb;

  const c = committee?.trim();
  if (!c) return null;

  for (const key of acronymLookupKey(c)) {
    const hit = WELL_KNOWN_COMMITTEE_FULL_NAME[key];
    if (hit) return hit;
  }
  return null;
}

/** Line for SMT grid: "Full name — Acronym/label", without session topic (`name`). */
export function formatCommitteeCardTitle(
  committeeFullName: string | null | undefined,
  committee: string | null | undefined
): string {
  const full = resolveCommitteeFullName(committeeFullName, committee);
  const ac = committee?.trim() || "";
  if (full && ac) return `${full} — ${ac}`;
  if (ac) return ac;
  return "Committee";
}

const PUBLIC_CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Stable 6-character A–Z / 0–9 reference for display (join codes stay unchanged). */
export function derivePublicCommitteeCode(conferenceId: string, committeeCode: string | null | undefined): string {
  const h = createHash("sha256").update(`${conferenceId}\0${committeeCode ?? ""}`).digest("hex");
  let out = "";
  for (let i = 0; i < 6; i++) {
    const slice = h.slice(i * 5, i * 5 + 8);
    const v = parseInt(slice, 16);
    const n = Number.isFinite(v) && v > 0 ? v : i + 1;
    out += PUBLIC_CODE_ALPHABET[n % 36]!;
  }
  return out;
}
