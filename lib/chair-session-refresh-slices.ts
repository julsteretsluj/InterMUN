// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Session floor refresh is expensive (~15 parallel queries + follow-ups).
 * Scope fetches to the active chair tool so Speakers/Timer don't wait on
 * resolutions/votes, and realtime pings for unrelated tables can no-op.
 *
 * `procedure` / `timer` are split out of `core` so a timers postgres_changes
 * event does not re-fetch procedure_states (and vice versa). That stampede was
 * saturating PostgREST’s small connection pool (504 / PGRST003 in prod logs).
 */

export type SessionRefreshSlice =
  | "core"
  | "procedure"
  | "timer"
  | "roll"
  | "announcements"
  | "voteItems"
  | "resolutions"
  | "voteBallots"
  | "timerLog"
  | "points"
  | "discipline";

export type SessionFloorSectionForRefresh =
  | "agenda"
  | "motions"
  | "discipline"
  | "timer"
  | "announcements"
  | "speakers"
  | "opening-speech"
  | "roll-call"
  | "all";

const ALL_SLICES: SessionRefreshSlice[] = [
  "core",
  "procedure",
  "timer",
  "roll",
  "announcements",
  "voteItems",
  "resolutions",
  "voteBallots",
  "timerLog",
  "points",
  "discipline",
];

/** Roster + speaker-queue floor — not procedure_states / timers. */
const CORE_WITH_LIVE: SessionRefreshSlice[] = ["core", "procedure", "timer"];

export function allSessionRefreshSlices(): SessionRefreshSlice[] {
  return [...ALL_SLICES];
}

export function slicesForSessionSection(
  section: SessionFloorSectionForRefresh
): SessionRefreshSlice[] {
  switch (section) {
    case "speakers":
    case "opening-speech":
      // Queue + timer floor_label ownership; roll/discipline for speaking eligibility.
      return [...CORE_WITH_LIVE, "roll", "discipline"];
    case "timer":
      // Bind-to-motion needs open vote_items; pause log for Timer → Log.
      return [...CORE_WITH_LIVE, "voteItems", "timerLog"];
    case "motions":
      return [
        ...CORE_WITH_LIVE,
        "roll",
        "voteItems",
        "resolutions",
        "voteBallots",
        "discipline",
        "points",
      ];
    case "agenda":
      return [...CORE_WITH_LIVE, "voteItems"];
    case "roll-call":
      return [...CORE_WITH_LIVE, "roll", "discipline"];
    case "announcements":
      return [...CORE_WITH_LIVE, "announcements"];
    case "discipline":
      return [...CORE_WITH_LIVE, "roll", "discipline", "points"];
    case "all":
    default:
      return allSessionRefreshSlices();
  }
}

/** Map a postgres_changes table to the slices it can invalidate. */
export function slicesForRealtimeTable(table: string): SessionRefreshSlice[] {
  switch (table) {
    case "roll_call_entries":
      return ["roll"];
    case "timers":
      return ["timer"];
    case "procedure_states":
      return ["procedure"];
    case "speaker_queue_entries":
    case "conferences":
      return ["core"];
    case "dais_announcements":
      return ["announcements"];
    case "vote_items":
      return ["voteItems"];
    case "votes":
    case "motion_audit_events":
    case "vote_rights_statements":
      return ["voteBallots"];
    case "resolutions":
    case "resolution_clauses":
      return ["resolutions"];
    case "timer_pause_events":
      return ["timerLog"];
    case "chair_session_points":
      return ["points"];
    case "chair_delegate_discipline":
      return ["discipline"];
    default:
      return allSessionRefreshSlices();
  }
}

/** Intersection of section needs and a realtime invalidation. Empty → skip refresh. */
export function intersectRefreshSlices(
  sectionSlices: readonly SessionRefreshSlice[],
  eventSlices: readonly SessionRefreshSlice[]
): SessionRefreshSlice[] {
  const want = new Set(sectionSlices);
  return eventSlices.filter((s) => want.has(s));
}
