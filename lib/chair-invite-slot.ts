import { DAIS_SEAT_CO_CHAIR, DAIS_SEAT_HEAD_CHAIR } from "@/lib/allocation-display-order";

export type ChairInviteSlot = "head" | "co";

/** Form value: `{uuid}|head` or `{uuid}|co` */
export function parseChairInviteSlot(raw: unknown): { conferenceId: string; slot: ChairInviteSlot } | null {
  const s = String(raw ?? "").trim();
  const pipe = s.indexOf("|");
  if (pipe < 0) return null;
  const conferenceId = s.slice(0, pipe).trim();
  const slot = s.slice(pipe + 1).trim();
  if (!/^[0-9a-f-]{36}$/i.test(conferenceId)) return null;
  if (slot !== "head" && slot !== "co") return null;
  return { conferenceId, slot: slot as ChairInviteSlot };
}

export function expectedDaisCountryForSlot(slot: ChairInviteSlot): string {
  return slot === "head" ? DAIS_SEAT_HEAD_CHAIR : DAIS_SEAT_CO_CHAIR;
}

export function allocationCountryMatchesChairSlot(country: string | null | undefined, slot: ChairInviteSlot): boolean {
  const c = String(country ?? "").trim().toLowerCase();
  if (slot === "head") return c === "head chair";
  return c === "co-chair" || c === "co chair";
}
