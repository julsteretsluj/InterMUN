// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Logical folder groupings for role navigation sidebars.
 * Edit folder membership here to reorganize nav without touching each component.
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

export type NavFolderMeta = {
  id: NavFolderId;
  emoji: string;
  /** i18n key under `navFolders` */
  labelKey: NavFolderId;
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
  crisisReport: "crisis",
  settings: "account",
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
  notes: "people",
  awards: "people",
  newsroom: "media",
  pressCorps: "media",
  milestones: "media",
  guides: "media",
  profile: "account",
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
    href === "/report" ||
    href === "/crisis" ||
    href === "/crisis-slides" ||
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

export type NavFolderGroup<T> = {
  folderId: NavFolderId;
  items: T[];
};

/** Bucket nav items into ordered folders; empty folders are omitted. */
export function groupNavByFolder<T>(
  items: readonly T[],
  folderOrder: readonly NavFolderId[],
  getFolderId: (item: T) => NavFolderId,
  compareItems?: (a: T, b: T) => number
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
      return { folderId, items: sortedItems };
    });
}

/** True when any item in the folder matches the active-route predicate. */
export function folderHasActiveChild<T>(
  items: readonly T[],
  isActive: (item: T) => boolean
): boolean {
  return items.some(isActive);
}
