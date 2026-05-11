export type EventScheduleDayKey = "1" | "2";

export type EventScheduleBlockKind = "session" | "break" | "ceremony";

export const EVENT_SCHEDULE_BLOCK_KINDS: readonly EventScheduleBlockKind[] = ["session", "break", "ceremony"];

export type EventScheduleSlot = {
  id: string;
  start: string;
  end: string;
  label: string;
  /** Session debate, break / lunch block, or opening/closing ceremony. */
  kind: EventScheduleBlockKind;
  /** Marks block as lunch for overlap analysis (independent of label text). */
  isLunch: boolean;
};

export type EventScheduleGroup = {
  id: string;
  name: string;
};

export type EventScheduleConfig = {
  version: 1;
  groups: EventScheduleGroup[];
  /** For each day, ordered time blocks per group id. */
  slots: Record<EventScheduleDayKey, Record<string, EventScheduleSlot[]>>;
};

export const EVENT_SCHEDULE_VERSION = 1 as const;

export const DEFAULT_EVENT_SCHEDULE_GROUPS: EventScheduleGroup[] = [
  { id: "g_ga", name: "GA & specialized" },
  { id: "g_crisis", name: "Crisis & advanced" },
  { id: "g_regional", name: "Regional & mixed" },
];

export function defaultEventScheduleConfig(): EventScheduleConfig {
  const slots: EventScheduleConfig["slots"] = { "1": {}, "2": {} };
  for (const g of DEFAULT_EVENT_SCHEDULE_GROUPS) {
    slots["1"][g.id] = [];
    slots["2"][g.id] = [];
  }
  return { version: 1, groups: [...DEFAULT_EVENT_SCHEDULE_GROUPS], slots };
}

function newSlot(partial?: Partial<EventScheduleSlot>): EventScheduleSlot {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    start: "09:00",
    end: "10:30",
    label: "",
    kind: "session",
    isLunch: false,
    ...partial,
  };
}

/** Row striping for schedule table (light + dark). */
export function scheduleSlotRowClass(kind: EventScheduleBlockKind): string {
  switch (kind) {
    case "session":
      return "border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]";
    case "break":
      return "border-l-[3px] border-l-amber-500 bg-amber-500/[0.10] dark:bg-amber-400/[0.14]";
    case "ceremony":
      return "border-l-[3px] border-l-[#C2A878] bg-[#C2A878]/15 dark:bg-[#C2A878]/20";
    default:
      return "";
  }
}

export function parseBlockKind(raw: unknown): EventScheduleBlockKind {
  if (raw === "break" || raw === "ceremony" || raw === "session") return raw;
  return "session";
}

export function parseTimeToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || h < 0 || min > 59 || min < 0) {
    return null;
  }
  return h * 60 + min;
}

export function minutesToHHMM(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export type LunchOverlapEntry = {
  day: EventScheduleDayKey;
  groupA: string;
  groupB: string;
  labelA: string;
  labelB: string;
  lunchAStart: string;
  lunchAEnd: string;
  lunchBStart: string;
  lunchBEnd: string;
  overlapStart: string;
  overlapEnd: string;
  overlapMinutes: number;
};

function lunchIntervalsForGroup(slots: EventScheduleSlot[]): { start: number; end: number; slot: EventScheduleSlot }[] {
  const out: { start: number; end: number; slot: EventScheduleSlot }[] = [];
  for (const s of slots) {
    if (!s.isLunch) continue;
    const a = parseTimeToMinutes(s.start);
    const b = parseTimeToMinutes(s.end);
    if (a === null || b === null || b <= a) continue;
    out.push({ start: a, end: b, slot: s });
  }
  return out;
}

export function computeLunchOverlaps(cfg: EventScheduleConfig): LunchOverlapEntry[] {
  const groupName = (id: string) => cfg.groups.find((g) => g.id === id)?.name ?? id;
  const days: EventScheduleDayKey[] = ["1", "2"];
  const results: LunchOverlapEntry[] = [];

  for (const day of days) {
    const daySlots = cfg.slots[day] ?? {};
    const groupIds = cfg.groups.map((g) => g.id);
    for (let i = 0; i < groupIds.length; i++) {
      for (let j = i + 1; j < groupIds.length; j++) {
        const ga = groupIds[i]!;
        const gb = groupIds[j]!;
        const lunchesA = lunchIntervalsForGroup(daySlots[ga] ?? []);
        const lunchesB = lunchIntervalsForGroup(daySlots[gb] ?? []);
        for (const la of lunchesA) {
          for (const lb of lunchesB) {
            const start = Math.max(la.start, lb.start);
            const end = Math.min(la.end, lb.end);
            if (end <= start) continue;
            results.push({
              day,
              groupA: ga,
              groupB: gb,
              labelA: la.slot.label.trim() || groupName(ga),
              labelB: lb.slot.label.trim() || groupName(gb),
              lunchAStart: minutesToHHMM(la.start),
              lunchAEnd: minutesToHHMM(la.end),
              lunchBStart: minutesToHHMM(lb.start),
              lunchBEnd: minutesToHHMM(lb.end),
              overlapStart: minutesToHHMM(start),
              overlapEnd: minutesToHHMM(end),
              overlapMinutes: end - start,
            });
          }
        }
      }
    }
  }
  results.sort((a, b) => {
    if (a.day !== b.day) return a.day === "1" ? -1 : 1;
    if (a.overlapMinutes !== b.overlapMinutes) return b.overlapMinutes - a.overlapMinutes;
    return `${a.groupA}-${a.groupB}`.localeCompare(`${b.groupA}-${b.groupB}`);
  });
  return results;
}

const MAX_GROUPS = 12;
const MAX_SLOTS_PER_GROUP_DAY = 40;

export type ScheduleValidationResult = { ok: true; config: EventScheduleConfig } | { ok: false; error: string };

export function normalizeScheduleConfig(raw: unknown): EventScheduleConfig {
  if (!raw || typeof raw !== "object") return defaultEventScheduleConfig();
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return defaultEventScheduleConfig();

  const groupsIn = Array.isArray(o.groups) ? o.groups : [];
  const groups: EventScheduleGroup[] = [];
  for (const g of groupsIn.slice(0, MAX_GROUPS)) {
    if (!g || typeof g !== "object") continue;
    const go = g as Record<string, unknown>;
    const id = String(go.id ?? "").trim().slice(0, 64);
    const name = String(go.name ?? "").trim().slice(0, 120);
    if (!id || !name) continue;
    groups.push({ id, name });
  }

  const base =
    groups.length > 0 ? groups : [...DEFAULT_EVENT_SCHEDULE_GROUPS.map((g) => ({ ...g }))];

  const slotsSrc = o.slots && typeof o.slots === "object" ? (o.slots as Record<string, unknown>) : {};
  const slots: EventScheduleConfig["slots"] = { "1": {}, "2": {} };

  for (const day of ["1", "2"] as EventScheduleDayKey[]) {
    const dayObj =
      slotsSrc[day] && typeof slotsSrc[day] === "object" ? (slotsSrc[day] as Record<string, unknown>) : {};
    for (const g of base) {
      const rawArr = dayObj[g.id];
      const arr: unknown[] = Array.isArray(rawArr) ? rawArr : [];
      const list: EventScheduleSlot[] = [];
      for (const row of arr.slice(0, MAX_SLOTS_PER_GROUP_DAY)) {
        if (!row || typeof row !== "object") continue;
        const ro = row as Record<string, unknown>;
        const id = String(ro.id ?? "").trim() || newSlot().id;
        const start = String(ro.start ?? "09:00").trim().slice(0, 5);
        const end = String(ro.end ?? "10:00").trim().slice(0, 5);
        const label = String(ro.label ?? "").trim().slice(0, 200);
        const kind = parseBlockKind(ro.kind);
        const isLunch = ro.isLunch === true;
        list.push({ id, start, end, label, kind, isLunch });
      }
      slots[day][g.id] = list;
    }
  }

  return { version: 1, groups: base, slots };
}

export function validateScheduleConfig(cfg: EventScheduleConfig): ScheduleValidationResult {
  if (cfg.groups.length === 0) return { ok: false, error: "At least one schedule group is required." };
  if (cfg.groups.length > MAX_GROUPS) return { ok: false, error: "Too many schedule groups." };

  const seen = new Set<string>();
  for (const g of cfg.groups) {
    if (!g.id.trim()) return { ok: false, error: "Each group needs an id." };
    if (seen.has(g.id)) return { ok: false, error: "Duplicate group id." };
    seen.add(g.id);
  }

  for (const day of ["1", "2"] as EventScheduleDayKey[]) {
    for (const g of cfg.groups) {
      const rows = cfg.slots[day]?.[g.id] ?? [];
      if (rows.length > MAX_SLOTS_PER_GROUP_DAY) {
        return { ok: false, error: "Too many blocks on one day for a group." };
      }
      for (const s of rows) {
        if (!EVENT_SCHEDULE_BLOCK_KINDS.includes(s.kind)) {
          return { ok: false, error: `Invalid block type in ${g.name}.` };
        }
        const a = parseTimeToMinutes(s.start);
        const b = parseTimeToMinutes(s.end);
        if (a === null || b === null) {
          return { ok: false, error: `Invalid time format in ${g.name} (use HH:MM).` };
        }
        if (b <= a) return { ok: false, error: `End time must be after start in ${g.name}.` };
      }
    }
  }

  return { ok: true, config: cfg };
}

export function addGroupToConfig(cfg: EventScheduleConfig, name: string): EventScheduleConfig {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `g_${crypto.randomUUID().slice(0, 8)}`
      : `g_${Date.now()}`;
  const nextGroups = [...cfg.groups, { id, name: name.trim().slice(0, 120) || "New group" }];
  const slots = { ...cfg.slots, "1": { ...cfg.slots["1"] }, "2": { ...cfg.slots["2"] } };
  slots["1"][id] = [];
  slots["2"][id] = [];
  return { ...cfg, groups: nextGroups, slots };
}

export function removeGroupFromConfig(cfg: EventScheduleConfig, groupId: string): EventScheduleConfig {
  const groups = cfg.groups.filter((g) => g.id !== groupId);
  const slots: EventScheduleConfig["slots"] = { "1": { ...cfg.slots["1"] }, "2": { ...cfg.slots["2"] } };
  delete slots["1"][groupId];
  delete slots["2"][groupId];
  if (groups.length === 0) return defaultEventScheduleConfig();
  return { ...cfg, groups, slots };
}

export { newSlot };
