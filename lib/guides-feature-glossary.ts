// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { GuideRole } from "@/lib/guides-curriculum";

export type GuideGlossaryKind = "role" | "feature";

export type GuideGlossarySpec = {
  id: string;
  kind: GuideGlossaryKind;
};

/** Feature/role definition cards for each how-to section (not MUN glossary or conference docs). */
export const GUIDE_SECTION_GLOSSARY: Record<
  GuideRole,
  Partial<Record<string, readonly GuideGlossarySpec[]>>
> = {
  delegate: {
    overview: [
      { id: "role", kind: "role" },
      { id: "hub", kind: "feature" },
      { id: "profile", kind: "feature" },
      { id: "committeeRoom", kind: "feature" },
      { id: "guides", kind: "feature" },
    ],
    prep: [
      { id: "stances", kind: "feature" },
      { id: "speeches", kind: "feature" },
      { id: "sources", kind: "feature" },
      { id: "ideas", kind: "feature" },
    ],
    floor: [
      { id: "committeeRoom", kind: "feature" },
      { id: "placard", kind: "feature" },
      { id: "caucus", kind: "feature" },
      { id: "voting", kind: "feature" },
      { id: "rollCallVote", kind: "feature" },
    ],
    documents: [
      { id: "resolutions", kind: "feature" },
      { id: "amendments", kind: "feature" },
      { id: "documents", kind: "feature" },
      { id: "runningNotes", kind: "feature" },
    ],
    tools: [
      { id: "notes", kind: "feature" },
      { id: "newsroom", kind: "feature" },
      { id: "pressCorps", kind: "feature" },
      { id: "milestones", kind: "feature" },
      { id: "history", kind: "feature" },
    ],
  },
  chair: {
    overview: [
      { id: "role", kind: "role" },
      { id: "prepChecklist", kind: "feature" },
      { id: "session", kind: "feature" },
      { id: "delegates", kind: "feature" },
      { id: "announcements", kind: "feature" },
    ],
    session: [
      { id: "rollCall", kind: "feature" },
      { id: "speakers", kind: "feature" },
      { id: "motions", kind: "feature" },
      { id: "timer", kind: "feature" },
      { id: "announcements", kind: "feature" },
      { id: "voting", kind: "feature" },
      { id: "resolutions", kind: "feature" },
      { id: "disciplinary", kind: "feature" },
    ],
    prep: [
      { id: "prepChecklist", kind: "feature" },
      { id: "flowChecklist", kind: "feature" },
      { id: "schedule", kind: "feature" },
      { id: "digitalRoom", kind: "feature" },
      { id: "crisis", kind: "feature" },
    ],
    tools: [
      { id: "awards", kind: "feature" },
      { id: "notes", kind: "feature" },
      { id: "newsroom", kind: "feature" },
      { id: "pressCorps", kind: "feature" },
      { id: "milestones", kind: "feature" },
      { id: "history", kind: "feature" },
      { id: "officialLinks", kind: "feature" },
      { id: "guides", kind: "feature" },
    ],
  },
  smt: {
    overview: [
      { id: "role", kind: "role" },
      { id: "liveCommittees", kind: "feature" },
      { id: "eventCode", kind: "feature" },
      { id: "roomCodes", kind: "feature" },
    ],
    operations: [
      { id: "eventSessions", kind: "feature" },
      { id: "roomCodes", kind: "feature" },
      { id: "allocationPasswords", kind: "feature" },
      { id: "liveOversight", kind: "feature" },
    ],
    people: [
      { id: "advisors", kind: "feature" },
      { id: "notes", kind: "feature" },
      { id: "awards", kind: "feature" },
    ],
    tools: [
      { id: "newsroom", kind: "feature" },
      { id: "pressCorps", kind: "feature" },
      { id: "milestones", kind: "feature" },
      { id: "conferenceGuides", kind: "feature" },
    ],
  },
  advisor: {
    overview: [
      { id: "role", kind: "role" },
      { id: "hub", kind: "feature" },
      { id: "delegates", kind: "feature" },
      { id: "guides", kind: "feature" },
    ],
    delegation: [
      { id: "notes", kind: "feature" },
      { id: "schedule", kind: "feature" },
      { id: "coaching", kind: "feature" },
      { id: "boundaries", kind: "feature" },
    ],
    tools: [
      { id: "newsroom", kind: "feature" },
      { id: "pressCorps", kind: "feature" },
      { id: "milestones", kind: "feature" },
      { id: "profile", kind: "feature" },
    ],
  },
  admin: {
    overview: [
      { id: "role", kind: "role" },
      { id: "event", kind: "feature" },
      { id: "setup", kind: "feature" },
      { id: "guides", kind: "feature" },
    ],
    setup: [
      { id: "newConference", kind: "feature" },
      { id: "committees", kind: "feature" },
      { id: "handoff", kind: "feature" },
      { id: "safety", kind: "feature" },
    ],
    tools: [
      { id: "newsroom", kind: "feature" },
      { id: "pressCorps", kind: "feature" },
      { id: "milestones", kind: "feature" },
      { id: "smtDashboard", kind: "feature" },
    ],
  },
};

export function guideSectionGlossary(
  role: GuideRole,
  sectionKey: string
): readonly GuideGlossarySpec[] | null {
  const entries = GUIDE_SECTION_GLOSSARY[role]?.[sectionKey];
  return entries && entries.length > 0 ? entries : null;
}
