/**
 * Navigation & hub priority order — edit these arrays to reorder numbered badges app-wide.
 * Lower index = lower number (1 = most important / start here).
 */

/** Delegate sidebar/dock (default role). */
export const DELEGATE_TAB_NAV_HREF_ORDER = [
  "/delegate",
  "/committee-room",
  "/chats-notes",
  "/voting",
  "/stances",
  "/speeches",
  "/running-notes",
  "/resolutions",
  "/history",
  "/documents",
  "/guides",
  "/sources",
  "/ideas",
  "/profile",
  "/report",
  "/crisis-slides",
  "/delegate/schedule",
] as const;

/** Chair, SMT, and admin sidebar/dock (includes chair-only routes). */
export const CHAIR_STAFF_TAB_NAV_HREF_ORDER = [
  "/chair/session",
  "/committee-room",
  "/chair/session/speakers",
  "/chair/session/motions",
  "/chair/session/agenda",
  "/voting",
  "/chair/session/roll-call",
  "/chair/session/timer",
  "/chair/session/announcements",
  "/chair/allocation-matrix",
  "/chair/digital-room",
  "/chair/awards",
  "/chair/room-code",
  "/chats-notes",
  "/history",
  "/chair/prep-checklist",
  "/chair/flow-checklist",
  "/documents",
  "/running-notes",
  "/resolutions",
  "/speeches",
  "/stances",
  "/report",
  "/crisis-slides",
  "/guides",
  "/sources",
  "/ideas",
  "/profile",
  "/delegate",
  "/smt/allocation-passwords",
] as const;

/** Advisor sidebar/dock. */
export const ADVISOR_TAB_NAV_HREF_ORDER = [
  "/advisor",
  "/advisor/notes",
  "/advisor/schedule",
  "/committee-room",
  "/voting",
  "/history",
  "/documents",
  "/guides",
  "/sources",
  "/resolutions",
  "/speeches",
  "/profile",
] as const;

/** TabNav home / session / library groups. */
export const MAIN_TAB_GROUP_ORDER = ["home", "session", "library"] as const;

/** Chair dashboard sidebar + mobile dock (`ChairNavItemKey`). */
export const CHAIR_NAV_ITEM_KEY_ORDER = [
  "session",
  "speakers",
  "formalMotions",
  "agenda",
  "voting",
  "rollCall",
  "timer",
  "announcements",
  "delegates",
  "digitalRoom",
  "conferenceSchedule",
  "prepChecklist",
  "flowChecklist",
  "history",
  "score",
  "discipline",
  "crisis",
  "crisisSlides",
  "archive",
  "notesModeration",
  "officialLinks",
  "roomCode",
  "settings",
] as const;

/** SMT secretariat sidebar + dock (`SmtNavKey`). */
export const SMT_NAV_KEY_ORDER = [
  "liveCommittees",
  "notes",
  "allocationMatrix",
  "eventSessions",
  "roomCodes",
  "awards",
  "advisors",
  "allocationPasswords",
  "profile",
] as const;

/** Delegate hub quick links (`delegateDashboard.tiles.*` keys). */
export const DELEGATE_HUB_TILE_KEY_ORDER = [
  "stances",
  "countdown",
  "matrix",
  "speeches",
  "running",
  "voting",
  "sources",
  "guides",
  "conferenceSchedule",
  "officialLinks",
  "chairEmails",
  "chairFeedback",
  "archive",
  "crisisSlides",
  "crisisReport",
] as const;

/** Chair hub jump tab (href). */
export const CHAIR_HUB_TILE_HREF_ORDER = [
  "/chair/session",
  "/chair/session/speakers",
  "/chair/session/motions",
  "/chair/session/agenda",
  "/voting",
  "/chair/session/roll-call",
  "/chair/session/timer",
  "/chair/session/announcements",
  "/chair/allocation-matrix",
  "/chair/digital-room",
  "/chair/prep-checklist",
  "/chair/flow-checklist",
  "/chair/awards",
  "/report",
  "/crisis-slides",
  "/documents",
  "/official-links",
  "/chair/room-code",
  "/committee-room",
] as const;

/** Delegate dashboard top tabs. */
export const DELEGATE_DASHBOARD_TAB_ORDER = ["overview", "jump", "checklist", "chairs"] as const;

/** Chair dashboard top tabs. */
export const CHAIR_DASHBOARD_TAB_ORDER = ["overview", "jump", "guidance"] as const;

/** Admin header links (href). */
export const ADMIN_NAV_HREF_ORDER = [
  "/admin",
  "/smt",
  "/conference-setup?next=%2Fadmin",
  "/smt/profile",
] as const;

/** Admin dashboard tabs. */
export const ADMIN_DASHBOARD_TAB_ORDER = ["setup", "checklist", "portal"] as const;

/** SMT committee detail tabs. */
export const SMT_COMMITTEE_DETAIL_TAB_ORDER = ["overview", "floor", "room", "history"] as const;

/** Profile page tabs. */
export const PROFILE_TAB_ORDER = ["overview", "awards", "private", "settings"] as const;

/** Profile delegate welcome quick links (href). */
export const PROFILE_DELEGATE_QUICK_LINK_HREF_ORDER = [
  "/committee-room",
  "/chats-notes",
  "/running-notes",
  "/voting",
  "/stances",
  "/speeches",
  "/resolutions",
  "/documents",
  "/guides",
  "/sources",
  "/ideas",
  "/crisis-slides",
  "/report",
] as const;

export function hrefPriorityRank(href: string, order: readonly string[]): number {
  const idx = order.indexOf(href as (typeof order)[number]);
  return idx >= 0 ? idx : 9999;
}

export function sortNavByHrefPriority<T extends { href: string }>(
  items: T[],
  order: readonly string[]
): T[] {
  return [...items].sort((a, b) => {
    const d = hrefPriorityRank(a.href, order) - hrefPriorityRank(b.href, order);
    if (d !== 0) return d;
    return a.href.localeCompare(b.href);
  });
}

export function sortByKeyPriority<T extends string, I extends { [K in keyof I]: unknown }>(
  items: I[],
  keyField: keyof I & string,
  order: readonly T[]
): I[] {
  const rank = new Map(order.map((k, i) => [k, i]));
  return [...items].sort((a, b) => {
    const ka = String(a[keyField]) as T;
    const kb = String(b[keyField]) as T;
    const d = (rank.get(ka) ?? 9999) - (rank.get(kb) ?? 9999);
    if (d !== 0) return d;
    return ka.localeCompare(kb);
  });
}

/** Assign 1-based priorities after sorting. */
export function withSequentialPriority<T>(items: readonly T[]): (T & { priority: number })[] {
  return items.map((item, index) => ({ ...item, priority: index + 1 }));
}
