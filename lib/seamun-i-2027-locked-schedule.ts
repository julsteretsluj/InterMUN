/**
 * Canonical SEAMUN I 2027 visual schedules (Day 1 & Day 2). Not editable via app or SMT.
 * Source: organisers’ schedules.pdf (three debate groups, June 2026).
 */

export const SEAMUN_I_2027_EVENT_ID = "11111111-1111-1111-1111-111111111101";

export type SeamunLockedBlockCategory =
  | "arrival_reg"
  | "ceremony"
  | "break_general"
  | "session"
  | "lunch"
  | "relax"
  | "support"
  | "strategy"
  | "dismissal"
  | "sweep";

export type SeamunLockedBlock = {
  start: string;
  end: string;
  title: string;
  location?: string;
  category: SeamunLockedBlockCategory;
};

export type SeamunLockedColumn = {
  header: string;
  blocks: SeamunLockedBlock[];
};

const D1_PREFIX: SeamunLockedBlock[] = [
  { start: "07:30", end: "08:30", title: "Arrival & Registration", category: "arrival_reg" },
  { start: "08:30", end: "09:15", title: "Opening Ceremony", category: "ceremony" },
  { start: "09:15", end: "09:45", title: "Break & Photo Ops", category: "break_general" },
  { start: "09:45", end: "10:00", title: "Icebreakers", category: "break_general" },
];

const D1_SUFFIX: SeamunLockedBlock[] = [
  { start: "16:30", end: "17:00", title: "Feedback Sessions & Delegate Departure", category: "dismissal" },
  { start: "17:00", end: "17:30", title: "Chair + SMT Departure", category: "dismissal" },
];

function d1col(header: string, middle: SeamunLockedBlock[]): SeamunLockedColumn {
  return { header, blocks: [...D1_PREFIX, ...middle, ...D1_SUFFIX] };
}

/** Day 1 — columns left → right: Group 1, Group 2, Group 3. */
export const SEAMUN_I_2027_DAY1_COLUMNS: SeamunLockedColumn[] = [
  d1col("Group 1 — UNHRC, DISEC, Press Corps", [
    { start: "10:00", end: "11:00", title: "Committee Session 1 – Motion Focused", category: "session" },
    { start: "11:00", end: "11:30", title: "Lunch (Eat)", category: "lunch" },
    { start: "11:30", end: "12:00", title: "Lunch (Socialise)", category: "relax" },
    { start: "12:00", end: "14:30", title: "Committee Session 2 – Resolution Writing", category: "session" },
    {
      start: "14:30",
      end: "15:00",
      title: "Break & Photo Ops – Resolutions Due",
      category: "break_general",
    },
    { start: "15:00", end: "16:30", title: "Committee Session 3 – Voting Procedures", category: "session" },
  ]),
  d1col("Group 2 — WHO, UN Women, UNSC", [
    { start: "10:00", end: "11:00", title: "Committee Session 1 – Motion Focused", category: "session" },
    { start: "11:00", end: "11:30", title: "Lunch (Socialise)", category: "relax" },
    { start: "11:30", end: "12:00", title: "Lunch (Eat)", category: "lunch" },
    { start: "12:00", end: "12:30", title: "Break", category: "break_general" },
    { start: "12:30", end: "14:30", title: "Committee Session 2 – Resolution Writing", category: "session" },
    {
      start: "14:30",
      end: "15:00",
      title: "Break & Photo Ops – Resolutions Due",
      category: "break_general",
    },
    { start: "15:00", end: "16:30", title: "Committee Session 3 – Voting Procedures", category: "session" },
  ]),
  d1col("Group 3 — ECOSOC, UNODC, INTERPOL, FWC", [
    { start: "10:00", end: "11:30", title: "Committee Session 1 – Motion Focused", category: "session" },
    { start: "11:30", end: "12:00", title: "Lunch (Socialise)", category: "relax" },
    { start: "12:00", end: "12:30", title: "Lunch (Eat)", category: "lunch" },
    { start: "12:30", end: "13:00", title: "Break", category: "break_general" },
    { start: "13:00", end: "14:30", title: "Committee Session 2 – Resolution Writing", category: "session" },
    {
      start: "14:30",
      end: "15:00",
      title: "Break & Photo Ops – Resolutions Due",
      category: "break_general",
    },
    { start: "15:00", end: "16:30", title: "Committee Session 3 – Voting Procedures", category: "session" },
  ]),
];

const D2_SUFFIX: SeamunLockedBlock[] = [
  { start: "16:30", end: "17:30", title: "Closing Ceremony", category: "ceremony" },
  { start: "17:30", end: "18:00", title: "Photo Ops & Chair + Delegate Departure", category: "dismissal" },
  { start: "18:00", end: "18:30", title: "SMT Departure", category: "sweep" },
];

function d2col(header: string, middle: SeamunLockedBlock[]): SeamunLockedColumn {
  return {
    header,
    blocks: [
      { start: "07:30", end: "08:30", title: "Arrival", category: "arrival_reg" },
      { start: "08:30", end: "09:00", title: "Registration & Photo Ops", category: "arrival_reg" },
      ...middle,
      ...D2_SUFFIX,
    ],
  };
}

/** Day 2 — columns left → right: Group 1, Group 2, Group 3. */
export const SEAMUN_I_2027_DAY2_COLUMNS: SeamunLockedColumn[] = [
  d2col("Group 1 — UNHRC, DISEC, Press Corps", [
    { start: "09:00", end: "10:00", title: "Committee Session 1 – Motion Focused", category: "session" },
    { start: "10:00", end: "10:30", title: "Break", category: "break_general" },
    {
      start: "10:30",
      end: "11:45",
      title: "Committee Session 2 – Motions & Resolution Writing",
      category: "session",
    },
    { start: "11:45", end: "12:00", title: "Break", category: "break_general" },
    { start: "12:00", end: "12:30", title: "Lunch (Socialise)", category: "relax" },
    { start: "12:30", end: "13:00", title: "Lunch (Eat)", category: "lunch" },
    { start: "13:00", end: "14:30", title: "Committee Session 3 – Resolution Writing", category: "session" },
    { start: "14:30", end: "15:00", title: "Break – Resolutions Due", category: "break_general" },
    { start: "15:00", end: "16:00", title: "Committee Session 4 – Voting Procedures", category: "session" },
    { start: "16:00", end: "16:30", title: "Feedback & Break", category: "break_general" },
  ]),
  d2col("Group 2 — WHO, UN Women, UNSC", [
    { start: "09:00", end: "10:00", title: "Committee Session 1 – Motion Focused", category: "session" },
    { start: "10:00", end: "10:30", title: "Break", category: "break_general" },
    {
      start: "10:30",
      end: "11:30",
      title: "Committee Session 2 – Motions & Resolution Writing",
      category: "session",
    },
    { start: "11:30", end: "12:00", title: "Lunch (Eat)", category: "lunch" },
    { start: "12:00", end: "12:30", title: "Lunch (Socialise)", category: "relax" },
    { start: "12:30", end: "14:30", title: "Committee Session 3 – Resolution Writing", category: "session" },
    { start: "14:30", end: "15:00", title: "Break – Resolutions Due", category: "break_general" },
    { start: "15:00", end: "16:00", title: "Committee Session 4 – Voting Procedures", category: "session" },
    { start: "16:00", end: "16:30", title: "Feedback & Break", category: "break_general" },
  ]),
  d2col("Group 3 — ECOSOC, UNODC, INTERPOL, FWC", [
    { start: "09:00", end: "10:00", title: "Committee Session 1 – Motion Focused", category: "session" },
    { start: "10:00", end: "10:30", title: "Break", category: "break_general" },
    {
      start: "10:30",
      end: "11:30",
      title: "Committee Session 2 – Motions & Resolution Writing",
      category: "session",
    },
    { start: "11:30", end: "12:00", title: "Lunch (Socialise)", category: "relax" },
    { start: "12:00", end: "12:30", title: "Lunch (Eat)", category: "lunch" },
    { start: "12:30", end: "14:30", title: "Committee Session 3 – Resolution Writing", category: "session" },
    { start: "14:30", end: "15:00", title: "Break – Resolutions Due", category: "break_general" },
    { start: "15:00", end: "16:00", title: "Committee Session 4 – Voting Procedures", category: "session" },
    { start: "16:00", end: "16:30", title: "Feedback & Break", category: "break_general" },
  ]),
];

export const SEAMUN_I_2027_AXIS_START_MIN = 7 * 60 + 30;
export const SEAMUN_I_2027_AXIS_END_MIN = 18 * 60 + 30;

export function isSeamunI2027LockedScheduleEvent(eventId: string, eventCode: string | null | undefined): boolean {
  const id = eventId.trim();
  if (id === SEAMUN_I_2027_EVENT_ID) return true;
  const c = (eventCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return c === "SEAMUNI2027";
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return h * 60 + m;
}
