// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Prep checklist plus session-progress stages chairs tick as committee unfolds. */

export type ChairPrepSection = {
  id: string;
  itemIds: string[];
};

export const CHAIR_PREP_SECTIONS: ChairPrepSection[] = [
  {
    id: "rules",
    itemIds: ["rop", "parliamentary", "speaking-times", "quorum"],
  },
  {
    id: "topic",
    itemIds: ["research", "study-guide", "dashboard-topic", "agenda"],
  },
  {
    id: "room",
    itemIds: ["digital-room", "tech-check", "backup"],
  },
  {
    id: "materials",
    itemIds: ["roll-plan", "speakers-plan", "templates", "timing"],
  },
  {
    id: "crisis",
    itemIds: ["crisis-slides", "crisis-cues", "crisis-paths"],
  },
  {
    id: "team",
    itemIds: ["co-chairs", "staff", "delegate-brief"],
  },
];

/** Session-progress stages chairs tick as committee unfolds; each check is shared with SMT. */
export const CHAIR_FLOW_ITEMS: { id: string }[] = [
  { id: "opening-speeches" },
  { id: "moderated-caucus" },
  { id: "unmoderated-caucus" },
  { id: "crisis" },
  { id: "resolution-writing" },
  { id: "resolution-debating" },
  { id: "amendments" },
  { id: "resolution-voting" },
  { id: "superlatives" },
];
