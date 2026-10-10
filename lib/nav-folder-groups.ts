// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Logical folder groupings for role navigation sidebars.
 * Edit folder membership here to reorganize nav without touching each component.
 *
 * Top-level folders may contain one level of nested subfolders (subfolder → items).
 */

export type NavFolderId =
  | "home"
  | "session"
  | "prep"
  | "resources"
  | "media"
  | "crisis"
  | "operations"
  | "people"
  | "library"
  | "account";

/** Nested groups under a top-level folder (one level deep). */
export type NavSubfolderId =
  | "floor"
  | "procedure"
  | "setup"
  | "checklists"
  | "media"
  | "docs"
  | "awards"
  | "reporting"
  | "fwc"
  | "live"
  | "allocation"
  | "roster";

export type NavFolderMeta = {
  id: NavFolderId;
  emoji: string;
  /** i18n key under `navFolders` */
  labelKey: NavFolderId;
};

export type NavSubfolderMeta = {
  id: NavSubfolderId;
  /** i18n key under `navFolders.subfolders` */
  labelKey: NavSubfolderId;
};

export const NAV_FOLDER_META: Record<NavFolderId, NavFolderMeta> = {
  home: { id: "home", emoji: "🏠", labelKey: "home" },
  session: { id: "session", emoji: "🧠", labelKey: "session" },
  prep: { id: "prep", emoji: "📋", labelKey: "prep" },
  resources: { id: "resources", emoji: "📚", labelKey: "resources" },
  media: { id: "media", emoji: "📰", labelKey: "media" },
  crisis: { id: "crisis", emoji: "⚠️", labelKey: "crisis" },
  operations: { id: "operations", emoji: "📡", labelKey: "operations" },
  people: { id: "people", emoji: "👥", labelKey: "people" },
  library: { id: "library", emoji: "📖", labelKey: "library" },
  account: { id: "account", emoji: "⚙️", labelKey: "account" },
};

export const NAV_SUBFOLDER_META: Record<NavSubfolderId, NavSubfolderMeta> = {
  floor: { id: "floor", labelKey: "floor" },
  procedure: { id: "procedure", labelKey: "procedure" },
  setup: { id: "setup", labelKey: "setup" },
  checklists: { id: "checklists", labelKey: "checklists" },
  media: { id: "media", labelKey: "media" },
  docs: { id: "docs", labelKey: "docs" },
  awards: { id: "awards", labelKey: "awards" },
  reporting: { id: "reporting", labelKey: "reporting" },
  fwc: { id: "fwc", labelKey: "fwc" },
  live: { id: "live", labelKey: "live" },
  allocation: { id: "allocation", labelKey: "allocation" },
  roster: { id: "roster", labelKey: "roster" },
};

/** Chair sidebar (`ChairNavItemKey`). */
export const CHAIR_NAV_FOLDER_ORDER: readonly NavFolderId[] = [
  "session",
  "prep",
  "resources",
  "crisis",
  "account",
];

export const CHAIR_ITEM_FOLDER: Record<string, NavFolderId> = {
  session: "session",
  rollCall: "session",
  speakers: "session",
  formalMotions: "session",
  agenda: "session",
  timer: "session",
  speechNotes: "session",
  announcements: "session",
  voting: "session",
  discipline: "session",
  resolutions: "session",
  amendments: "session",
  prepChecklist: "prep",
  flowChecklist: "prep",
  conferenceSchedule: "prep",
  delegates: "prep",
  digitalRoom: "prep",
  roomCode: "prep",
  history: "resources",
  newsroom: "resources",
  pressCorps: "resources",
  milestones: "resources",
  guides: "resources",
  archive: "resources",
  notesModeration: "resources",
  officialLinks: "resources",
  score: "resources",
  crisis: "crisis",
  fwcDirectives: "crisis",
  fwcMovement: "crisis",
  fwcMap: "crisis",
  fwcCrisis: "crisis",
  fwcControl: "crisis",
  fwcBackroom: "crisis",
  fwcEvidence: "crisis",
  settings: "account",
};

/** Nested groups under chair top-level folders. */
export const CHAIR_SUBFOLDER_ORDER: Partial<Record<NavFolderId, readonly NavSubfolderId[]>> = {
  session: ["floor", "procedure"],
  prep: ["setup", "checklists"],
  resources: ["media", "docs", "awards"],
  crisis: ["reporting", "fwc"],
};

export const CHAIR_ITEM_SUBFOLDER: Record<string, NavSubfolderId> = {
  session: "floor",
  speakers: "floor",
  timer: "floor",
  speechNotes: "floor",
  rollCall: "floor",
  announcements: "floor",
  formalMotions: "procedure",
  agenda: "procedure",
  voting: "procedure",
  discipline: "procedure",
  resolutions: "procedure",
  amendments: "procedure",
  roomCode: "setup",
  digitalRoom: "setup",
  delegates: "setup",
  conferenceSchedule: "setup",
  prepChecklist: "checklists",
  flowChecklist: "checklists",
  newsroom: "media",
  pressCorps: "media",
  history: "docs",
  guides: "docs",
  archive: "docs",
  officialLinks: "docs",
  notesModeration: "docs",
  milestones: "awards",
  score: "awards",
  crisis: "reporting",
  fwcDirectives: "fwc",
  fwcMovement: "fwc",
  fwcMap: "fwc",
  fwcCrisis: "fwc",
  fwcControl: "fwc",
  fwcBackroom: "fwc",
  fwcEvidence: "fwc",
};

/** SMT sidebar (`SmtNavKey`). */
export const SMT_NAV_FOLDER_ORDER: readonly NavFolderId[] = [
  "operations",
  "people",
  "media",
  "account",
];

export const SMT_ITEM_FOLDER: Record<string, NavFolderId> = {
  liveCommittees: "operations",
  eventSessions: "operations",
  roomCodes: "operations",
  allocationMatrix: "operations",
  allocationPasswords: "operations",
  advisors: "people",
  delegates: "people",
  notes: "people",
  newsroom: "media",
  pressCorps: "media",
  guides: "media",
  profile: "account",
};

export const SMT_SUBFOLDER_ORDER: Partial<Record<NavFolderId, readonly NavSubfolderId[]>> = {
  operations: ["live", "allocation"],
  people: ["roster"],
};

export const SMT_ITEM_SUBFOLDER: Record<string, NavSubfolderId> = {
  liveCommittees: "live",
  eventSessions: "live",
  roomCodes: "live",
  allocationMatrix: "allocation",
  allocationPasswords: "allocation",
  advisors: "roster",
  delegates: "roster",
  notes: "roster",
};

/** Advisor sidebar (`labelKey` on items). */
export const ADVISOR_NAV_FOLDER_ORDER: readonly NavFolderId[] = ["home", "media", "account"];

export const ADVISOR_ITEM_FOLDER: Record<string, NavFolderId> = {
  hub: "home",
  notes: "home",
  schedule: "home",
  newsroom: "media",
  pressCorps: "media",
  milestones: "media",
  guides: "media",
  profile: "account",
};

/** Delegate TabNav — maps href to folder (home / session / library). */
export const TAB_NAV_FOLDER_ORDER: readonly NavFolderId[] = ["home", "session", "library"];

export function tabHrefFolder(href: string): NavFolderId {
  if (
    href === "/delegate" ||
    href === "/advisor" ||
    href === "/advisor/notes" ||
    href === "/profile" ||
    href.endsWith("/schedule")
  ) {
    return "home";
  }
  if (
    href === "/chats-notes" ||
    href === "/committee-room" ||
    href === "/history" ||
    href === "/voting" ||
    href === "/resolutions" ||
    href === "/amendments" ||
    href === "/running-notes" ||
    href === "/crisis" ||
    href === "/crisis-slides" ||
    href === "/fwc/directives" ||
    href === "/fwc/movement" ||
    href === "/fwc/map" ||
    href === "/fwc/crisis" ||
    href === "/chair/fwc/control" ||
    href === "/chair/fwc/backroom" ||
    href === "/chair/fwc/evidence" ||
    href === "/chair/session" ||
    href.startsWith("/chair/session/") ||
    href === "/chair/room-code" ||
    href === "/chair/allocation-matrix" ||
    href === "/chair/awards" ||
    href === "/smt/allocation-passwords"
  ) {
    return "session";
  }
  return "library";
}

export type NavSubfolderGroup<T> = {
  subfolderId: NavSubfolderId;
  items: T[];
};

export type NavFolderGroup<T> = {
  folderId: NavFolderId;
  /** Flat list of every item in this folder (for active detection / mobile docks). */
  items: T[];
  /** Nested sections; empty when the folder has no subfolder mapping. */
  subfolders: NavSubfolderGroup<T>[];
  /** Items not assigned to a subfolder (rendered as direct children). */
  looseItems: T[];
};

export type GroupNavByFolderOptions<T> = {
  getSubfolderId?: (item: T) => NavSubfolderId | null | undefined;
  subfolderOrder?: Partial<Record<NavFolderId, readonly NavSubfolderId[]>>;
};

/** Bucket nav items into ordered folders; empty folders are omitted. */
export function groupNavByFolder<T>(
  items: readonly T[],
  folderOrder: readonly NavFolderId[],
  getFolderId: (item: T) => NavFolderId,
  compareItems?: (a: T, b: T) => number,
  options?: GroupNavByFolderOptions<T>
): NavFolderGroup<T>[] {
  const buckets = new Map<NavFolderId, T[]>();
  for (const item of items) {
    const fid = getFolderId(item);
    const list = buckets.get(fid) ?? [];
    list.push(item);
    buckets.set(fid, list);
  }
  return folderOrder
    .filter((fid) => (buckets.get(fid)?.length ?? 0) > 0)
    .map((folderId) => {
      const bucket = buckets.get(folderId)!;
      const sortedItems = compareItems ? [...bucket].sort(compareItems) : bucket;
      const order = options?.subfolderOrder?.[folderId] ?? [];
      const getSub = options?.getSubfolderId;

      if (!getSub || order.length === 0) {
        return {
          folderId,
          items: sortedItems,
          subfolders: [],
          looseItems: sortedItems,
        };
      }

      const subBuckets = new Map<NavSubfolderId, T[]>();
      const loose: T[] = [];
      for (const item of sortedItems) {
        const sid = getSub(item);
        if (sid && order.includes(sid)) {
          const list = subBuckets.get(sid) ?? [];
          list.push(item);
          subBuckets.set(sid, list);
        } else {
          loose.push(item);
        }
      }

      const subfolders = order
        .filter((sid) => (subBuckets.get(sid)?.length ?? 0) > 0)
        .map((subfolderId) => ({
          subfolderId,
          items: subBuckets.get(subfolderId)!,
        }));

      return {
        folderId,
        items: sortedItems,
        subfolders,
        looseItems: loose,
      };
    });
}

/** True when any item in the folder matches the active-route predicate. */
export function folderHasActiveChild<T>(
  items: readonly T[],
  isActive: (item: T) => boolean
): boolean {
  return items.some(isActive);
}
