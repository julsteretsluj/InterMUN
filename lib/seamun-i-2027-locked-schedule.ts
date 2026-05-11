/** Canonical SEAMUN I 2027 visual schedules (Day 1 & Day 2). Not editable via app or SMT. */

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
  {
    start: "07:30",
    end: "08:30",
    title: "Arrival / Registration",
    location: "1st Floor, All",
    category: "arrival_reg",
  },
  { start: "08:30", end: "09:15", title: "Ceremony", location: "Hall, All", category: "ceremony" },
  { start: "09:15", end: "09:45", title: "Break", location: "Foyer, All", category: "break_general" },
];

const D1_SUFFIX: SeamunLockedBlock[] = [
  { start: "15:30", end: "16:00", title: "Break", location: "Foyer, All", category: "break_general" },
  { start: "17:00", end: "17:30", title: "Dismissal", location: "Rooms, All", category: "dismissal" },
];

function d1col(
  header: string,
  middle: SeamunLockedBlock[]
): SeamunLockedColumn {
  return { header, blocks: [...D1_PREFIX, ...middle, ...D1_SUFFIX] };
}

/** Day 1 — columns left → right: Group 1 … Group 4, Support. */
export const SEAMUN_I_2027_DAY1_COLUMNS: SeamunLockedColumn[] = [
  d1col("Group 1 (1st UL) — Team Alpha", [
    { start: "09:45", end: "11:30", title: "Session 1", location: "1st Floor UL", category: "session" },
    { start: "11:30", end: "12:00", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "12:00", end: "12:30", title: "Chill", location: "Foyer", category: "relax" },
    { start: "12:30", end: "14:00", title: "Session 1 (cont.)", location: "1st Floor UL", category: "session" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "1st Floor UL", category: "session" },
    { start: "16:00", end: "17:00", title: "Session 3", location: "1st Floor UL", category: "session" },
  ]),
  d1col("Group 2 (Mixed) — Team Beta", [
    { start: "09:45", end: "12:00", title: "Session 1", location: "UL / ML rooms", category: "session" },
    { start: "12:00", end: "12:30", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "12:30", end: "13:00", title: "Chill", location: "Foyer", category: "relax" },
    { start: "13:00", end: "14:00", title: "Session 1 (cont.)", location: "UL / ML rooms", category: "session" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "UL / ML rooms", category: "session" },
    { start: "16:00", end: "17:00", title: "Session 3", location: "UL / ML rooms", category: "session" },
  ]),
  d1col("Group 3 (1st ML) — Team Gamma", [
    { start: "09:45", end: "12:30", title: "Session 1", location: "1st Floor ML", category: "session" },
    { start: "12:30", end: "13:00", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "13:00", end: "13:30", title: "Chill", location: "Foyer", category: "relax" },
    { start: "13:30", end: "14:00", title: "Session 1 (cont.)", location: "1st Floor ML", category: "session" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "1st Floor ML", category: "session" },
    { start: "16:00", end: "17:00", title: "Session 3", location: "1st Floor ML", category: "session" },
  ]),
  d1col("Group 4 (2nd ML) — Team Delta", [
    { start: "09:45", end: "13:00", title: "Session 1", location: "2nd Floor ML", category: "session" },
    { start: "13:00", end: "13:30", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "13:30", end: "14:00", title: "Chill", location: "Foyer", category: "relax" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "2nd Floor ML", category: "session" },
    { start: "16:00", end: "17:00", title: "Session 3", location: "2nd Floor ML", category: "session" },
  ]),
  d1col("Support / Sensory — Team Epsilon", [
    { start: "09:45", end: "11:30", title: "Support room", location: "Rooms 7 / 7a", category: "support" },
    { start: "11:30", end: "12:00", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "12:00", end: "12:30", title: "Chill", location: "Foyer", category: "relax" },
    { start: "12:30", end: "14:00", title: "Support room", location: "Rooms 7 / 7a", category: "support" },
    { start: "14:00", end: "15:30", title: "Support room", location: "Rooms 7 / 7a", category: "support" },
    { start: "16:00", end: "17:00", title: "Support room", location: "Rooms 7 / 7a", category: "support" },
  ]),
];

const D2_STRATEGY: SeamunLockedBlock[] = [
  {
    start: "08:30",
    end: "09:15",
    title: "Strategy rooms",
    location: "All",
    category: "strategy",
  },
];

const D2_SUFFIX: SeamunLockedBlock[] = [
  { start: "15:30", end: "16:00", title: "Break", location: "Foyer, All", category: "break_general" },
  { start: "16:00", end: "17:00", title: "Ceremony", location: "Hall, All", category: "ceremony" },
  { start: "17:00", end: "17:30", title: "Sweep", location: "Venue, All", category: "sweep" },
];

function d2col(header: string, middle: SeamunLockedBlock[]): SeamunLockedColumn {
  return { header, blocks: [...D2_STRATEGY, ...middle, ...D2_SUFFIX] };
}

/** Day 2 — columns left → right as published: Group 4, 3, 2, 1, Support. */
export const SEAMUN_I_2027_DAY2_COLUMNS: SeamunLockedColumn[] = [
  d2col("Group 4 (2nd ML) — Team Beta", [
    { start: "09:15", end: "11:30", title: "Session 1", location: "2nd Floor ML", category: "session" },
    { start: "11:30", end: "12:00", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "12:00", end: "12:30", title: "Chill", location: "Foyer", category: "relax" },
    { start: "12:30", end: "14:00", title: "Session 1 (cont.)", location: "2nd Floor ML", category: "session" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "2nd Floor ML", category: "session" },
  ]),
  d2col("Group 3 (1st ML) — Team Alpha", [
    { start: "09:15", end: "12:00", title: "Session 1", location: "1st Floor ML", category: "session" },
    { start: "12:00", end: "12:30", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "12:30", end: "13:00", title: "Chill", location: "Foyer", category: "relax" },
    { start: "13:00", end: "14:00", title: "Session 1 (cont.)", location: "1st Floor ML", category: "session" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "1st Floor ML", category: "session" },
  ]),
  d2col("Group 2 (Mixed) — Team Epsilon", [
    { start: "09:15", end: "12:30", title: "Session 1", location: "UL / ML rooms", category: "session" },
    { start: "12:30", end: "13:00", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "13:00", end: "13:30", title: "Chill", location: "Foyer", category: "relax" },
    { start: "13:30", end: "14:00", title: "Session 1 (cont.)", location: "UL / ML rooms", category: "session" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "UL / ML rooms", category: "session" },
  ]),
  d2col("Group 1 (1st UL) — Team Delta", [
    { start: "09:15", end: "13:00", title: "Session 1", location: "1st Floor UL", category: "session" },
    { start: "13:00", end: "13:30", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "13:30", end: "14:00", title: "Chill", location: "Foyer", category: "relax" },
    { start: "14:00", end: "15:30", title: "Session 2", location: "1st Floor UL", category: "session" },
  ]),
  d2col("Support / Sensory — Team Gamma", [
    { start: "09:15", end: "13:00", title: "Support room", location: "Rooms 7 / 7a", category: "support" },
    { start: "13:00", end: "13:30", title: "Eat", location: "Cafeteria", category: "lunch" },
    { start: "13:30", end: "14:00", title: "Chill", location: "Foyer", category: "relax" },
    { start: "14:00", end: "15:30", title: "Support room", location: "Rooms 7 / 7a", category: "support" },
  ]),
];

export const SEAMUN_I_2027_AXIS_START_MIN = 7 * 60;
export const SEAMUN_I_2027_AXIS_END_MIN = 17 * 60 + 30;

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
