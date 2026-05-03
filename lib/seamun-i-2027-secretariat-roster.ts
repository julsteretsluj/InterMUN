/**
 * Secretariat leadership & staff roster from the OVERVIEW sheet of
 * “Delegate Allocation Matrix — SEAMUN I 2027” (authoritative for this event).
 */
export type SeamunParliamentarianRow = {
  role: "Parliamentarian";
  name: string;
  email: string | null;
  /** Right column on matrix: which difficulty tier this parliamentarian covers */
  committeeOverviewTier: "Beginner" | "Intermediate" | "Advanced";
};

export type SeamunLeadershipRow =
  | { role: "Secretary General" | "Deputy Secretary General"; name: string; email: string | null }
  | SeamunParliamentarianRow;

export const SEAMUN_I_2027_EVENT_CODE = "SEAMUNI2027";

export const SEAMUN_I_2027_SECRETARIAT_CONTACTS = {
  smtEmail: "information@seamun.com",
  financeEmail: "finance@seamun.com",
} as const;

/**
 * SMT / secretariat sheet row labels (`allocations.country`) — matches OVERVIEW order:
 * leadership, operations, media. Parliamentarian rows are disambiguated by tier.
 */
export const SEAMUN_I_2027_SMT_ALLOCATION_COUNTRY_LABELS = [
  "Secretary General",
  "Deputy Secretary General",
  "Parliamentarian (Beginner)",
  "Parliamentarian (Intermediate)",
  "Parliamentarian (Advanced)",
  "Head of Logistics",
  "Head of Finance",
  "Head of Community Outreach",
  "Head of Delegate Affairs",
  "Head of Media",
  "Head of PR & Advertising",
] as const;

export const SEAMUN_I_2027_LEADERSHIP: SeamunLeadershipRow[] = [
  { role: "Secretary General", name: "Jules K.A.", email: "juleskittoastrop@gmail.com" },
  { role: "Deputy Secretary General", name: "Emily H.", email: "emily.yhstudent@sisbschool.com" },
  {
    role: "Parliamentarian",
    name: "Sam S.",
    email: "samridh061009@gmail.com",
    committeeOverviewTier: "Beginner",
  },
  {
    role: "Parliamentarian",
    name: "Sparkle W.",
    email: "sparshikaw05@gmail.com",
    committeeOverviewTier: "Intermediate",
  },
  {
    role: "Parliamentarian",
    name: "Venice K.",
    email: "venicekawisara25@gmail.com",
    committeeOverviewTier: "Advanced",
  },
];

export const SEAMUN_I_2027_OPERATIONS: { role: string; name: string; email: string | null }[] = [
  { role: "Head of Logistics", name: "Moonum C.", email: "reddragonetz@gmail.com" },
  { role: "Head of Finance", name: "Mannan P.", email: "mannanparikh27@gmail.com" },
  { role: "Head of Community Outreach", name: "Myesha S.", email: "sonimyesha@gmail.com" },
  { role: "Head of Delegate Affairs", name: "Dominic S.S.", email: "dominicstott09@gmail.com" },
];

export const SEAMUN_I_2027_MEDIA: { role: string; name: string; email: string | null }[] = [
  { role: "Head of Media", name: "Joanna H.", email: "joannaherbert747@gmail.com" },
  { role: "Head of PR & Advertising", name: "Phil R.", email: "sarana79262@gmail.com" },
];

/** Matrix cells that are not valid addresses (no `@`, spaces) render as plain text, not mailto. */
export function emailLooksClickable(raw: string | null | undefined): raw is string {
  const s = String(raw ?? "").trim();
  return s.length > 3 && s.includes("@") && !s.includes(" ");
}
