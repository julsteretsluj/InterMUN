/**
 * Secretariat roster shape for SEAMUN I 2027 UI (allocation matrix / oversight).
 * Replace emails and names with your conference’s public contacts in a private fork or
 * load from your own data source — do not commit real delegate or organiser inboxes here.
 */
export type SeamunParliamentarianRow = {
  role: "Parliamentarian";
  name: string;
  email: string | null;
};

export type SeamunLeadershipRow =
  | { role: "Secretary General" | "Deputy Secretary General"; name: string; email: string | null }
  | SeamunParliamentarianRow;

export const SEAMUN_I_2027_EVENT_CODE = "SEAMUNI2027";

export const SEAMUN_I_2027_SECRETARIAT_CONTACTS = {
  smtEmail: "information@example.org",
  financeEmail: "finance@example.org",
} as const;

/**
 * SMT / secretariat sheet row labels (`allocations.country`) — matches typical OVERVIEW order:
 * leadership, operations, media. Three parliamentarian seats use the same role label.
 */
export const SEAMUN_I_2027_SMT_ALLOCATION_COUNTRY_LABELS = [
  "Secretary General",
  "Deputy Secretary General",
  "Parliamentarian",
  "Parliamentarian",
  "Parliamentarian",
  "Head of Logistics",
  "Head of Finance",
  "Head of Community Outreach",
  "Head of Delegate Affairs",
  "Head of Media",
  "Head of PR & Advertising",
] as const;

/** Ad-hoc seats for the SMT sheet (manual / quick-add). */
export const SMT_TEMPORARY_SEAT_LABELS = ["Temporary SMT", "Temporary advisor"] as const;

export const SEAMUN_I_2027_LEADERSHIP: SeamunLeadershipRow[] = [
  { role: "Secretary General", name: "—", email: "secretary-general@example.org" },
  { role: "Deputy Secretary General", name: "—", email: "deputy-secretary-general@example.org" },
  { role: "Parliamentarian", name: "—", email: "parliamentarian-a@example.org" },
  { role: "Parliamentarian", name: "—", email: "parliamentarian-b@example.org" },
  { role: "Parliamentarian", name: "—", email: "parliamentarian-c@example.org" },
];

export const SEAMUN_I_2027_OPERATIONS: { role: string; name: string; email: string | null }[] = [
  { role: "Head of Logistics", name: "—", email: "logistics@example.org" },
  { role: "Head of Finance", name: "—", email: "finance-ops@example.org" },
  { role: "Head of Community Outreach", name: "—", email: "outreach@example.org" },
  { role: "Head of Delegate Affairs", name: "—", email: "delegate-affairs@example.org" },
];

export const SEAMUN_I_2027_MEDIA: { role: string; name: string; email: string | null }[] = [
  { role: "Head of Media", name: "—", email: "media@example.org" },
  { role: "Head of PR & Advertising", name: "—", email: "pr@example.org" },
];

/** Matrix cells that are not valid addresses (no `@`, spaces) render as plain text, not mailto. */
export function emailLooksClickable(raw: string | null | undefined): raw is string {
  const s = String(raw ?? "").trim();
  return s.length > 3 && s.includes("@") && !s.includes(" ");
}
