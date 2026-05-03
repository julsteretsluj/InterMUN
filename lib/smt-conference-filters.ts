import { SMT_COMMITTEE_CODE } from "@/lib/committee-join-code";

/** SMT / secretariat sheet: second-gate SMT227 (or legacy code / committee = smt). */
export function isSmtSecretariatConferenceRow(c: {
  committee?: string | null;
  committee_code?: string | null;
}): boolean {
  const code = c.committee_code?.trim().toUpperCase() ?? "";
  if (code === SMT_COMMITTEE_CODE) return true;
  if (code === "SECRETARIAT2027") return true;
  return c.committee?.trim().toLowerCase() === "smt";
}

/**
 * `getDaisSeatLabelsForCommittee` / SMT legacy cleanup use `committeeSessionGroupKey(committee)`.
 * Secretariat rows often set `committee_code` (SMT227) but omit `committee`; pass this instead of raw `committee`.
 */
export function committeeHintForSmtDaisPlan(c: {
  committee?: string | null;
  committee_code?: string | null;
}): string | null {
  if (isSmtSecretariatConferenceRow(c)) return "SMT";
  const t = c.committee?.trim();
  return t ? t : null;
}

/**
 * Legacy row that mirrors the event name (e.g. "SEAMUN I 2027") without a real chamber.
 * Not a delegate committee — hide from room-code editing like the allocation matrix does.
 */
export function isEventNameOverlayConferenceRow(c: {
  name?: string | null;
  committee?: string | null;
}): boolean {
  const name = c.name?.trim().toLowerCase();
  const committee = c.committee?.trim().toLowerCase();
  return name === "seamun i 2027" || committee === "seamun i 2027";
}

/** Room codes / second gate: only real committee chambers (not event overlay or SMT sheet). */
export function filterConferencesForSmtRoomCodes<
  T extends {
    name?: string | null;
    committee?: string | null;
    committee_code?: string | null;
  },
>(rows: T[]): T[] {
  return rows.filter(
    (c) => !isEventNameOverlayConferenceRow(c) && !isSmtSecretariatConferenceRow(c)
  );
}
