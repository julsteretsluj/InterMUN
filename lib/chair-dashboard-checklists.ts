/** Checklist copy aligned with [SEAMUNs chair dashboard](https://thedashboard.seamuns.site/chair) prep & flow sections. */

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

/** Labels match SEAMUNs “Committee flow checklist” checkboxes (thedashboard.seamuns.site/chair → Flow checklist). */
export const CHAIR_FLOW_ITEMS: { id: string }[] = [
  { id: "roll-call" },
  { id: "open-floor" },
  { id: "recognize" },
  { id: "vote-1" },
  { id: "engage" },
  { id: "open-again" },
  { id: "recognize-repeat" },
  { id: "vote-2" },
  { id: "cycle" },
];
