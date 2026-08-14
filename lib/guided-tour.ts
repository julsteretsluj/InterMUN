// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export type GuidedTourView = "chair" | "delegate" | "smt" | "advisor" | "admin";

export type GuidedTourStep = {
  id: string;
  /** `data-tour` id. Omit for a centered intro card. */
  target?: string;
};

export const GUIDED_TOUR_STORAGE_PREFIX = "intermun-guided-tour";
export const GUIDED_TOUR_VERSION = "v1";

export function guidedTourStorageKey(view: GuidedTourView): string {
  return `${GUIDED_TOUR_STORAGE_PREFIX}:${view}:${GUIDED_TOUR_VERSION}`;
}

/** Spotlight sequence per dashboard chrome. Targets that are hidden are skipped. */
export const GUIDED_TOUR_STEPS: Record<GuidedTourView, readonly GuidedTourStep[]> = {
  chair: [
    { id: "welcome" },
    { id: "sidebar", target: "tour-nav" },
    { id: "session", target: "nav-session" },
    { id: "agenda", target: "nav-agenda" },
    { id: "rollCall", target: "nav-rollCall" },
    { id: "delegates", target: "nav-delegates" },
    { id: "timer", target: "nav-timer" },
    { id: "notes", target: "nav-notesModeration" },
    { id: "score", target: "nav-score" },
    { id: "topbar", target: "tour-topbar" },
  ],
  delegate: [
    { id: "welcome" },
    { id: "sidebar", target: "tour-nav" },
    { id: "committee", target: "nav-committee" },
    { id: "documents", target: "nav-documents" },
    { id: "voting", target: "nav-voting" },
    { id: "notes", target: "nav-notes" },
    { id: "profile", target: "nav-profile" },
    { id: "topbar", target: "tour-topbar" },
  ],
  smt: [
    { id: "welcome" },
    { id: "committees", target: "nav-liveCommittees" },
    { id: "roomCodes", target: "nav-roomCodes" },
    { id: "matrix", target: "nav-allocationMatrix" },
    { id: "awards", target: "nav-awards" },
    { id: "notes", target: "nav-notes" },
    { id: "advisors", target: "nav-advisors" },
    { id: "topbar", target: "tour-topbar" },
  ],
  advisor: [
    { id: "welcome" },
    { id: "hub", target: "nav-hub" },
    { id: "notes", target: "nav-notes" },
    { id: "schedule", target: "nav-schedule" },
    { id: "guides", target: "nav-guides" },
    { id: "topbar", target: "tour-topbar" },
  ],
  admin: [
    { id: "welcome" },
    { id: "overview", target: "nav-admin-overview" },
    { id: "conference", target: "nav-admin-conference" },
    { id: "smt", target: "nav-admin-smt" },
    { id: "guides", target: "nav-admin-guides" },
  ],
};

export function findVisibleTourTarget(id: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  return (
    nodes.find((el) => {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return false;
      return r.width >= 8 && r.height >= 8;
    }) ?? null
  );
}
