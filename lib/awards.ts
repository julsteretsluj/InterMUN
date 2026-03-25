/**
 * SEAMUN I award categories (handbook: Awards for SEAMUN I 2027).
 * `scope` drives which fields are required in the chair UI.
 */
export type AwardScope = "conference_wide" | "collective_person" | "collective_committee" | "committee";

export const AWARD_CATEGORIES: {
  id: string;
  label: string;
  description: string;
  scope: AwardScope;
}[] = [
  {
    id: "conference_best_delegate",
    label: "Best Delegate (conference-wide)",
    description:
      "Highest performance across the entire conference—diplomacy, RoP, resolutions.",
    scope: "conference_wide",
  },
  {
    id: "conference_best_position_paper",
    label: "Best Position Paper (conference-wide)",
    description: "Most exceptional pre-conference research and policy alignment.",
    scope: "conference_wide",
  },
  {
    id: "best_chair",
    label: "Best Chair",
    description: "Impartiality, control of the house, delegate growth.",
    scope: "collective_person",
  },
  {
    id: "honourable_mention_chair",
    label: "Honourable Mention — Chair",
    description: "Outstanding support and execution on the dais.",
    scope: "collective_person",
  },
  {
    id: "best_committee",
    label: "Best Committee",
    description: "Highest engagement, productivity, and collaborative spirit.",
    scope: "collective_committee",
  },
  {
    id: "best_chair_report",
    label: "Best Chair Report",
    description: "Best study guide / chair report—comprehensive and academically sound.",
    scope: "collective_committee",
  },
  {
    id: "committee_best_delegate",
    label: "Best Delegate (committee)",
    description: "Top delegate within this committee—drove debate and compromise.",
    scope: "committee",
  },
  {
    id: "committee_honourable_mention",
    label: "Honourable Mention (committee)",
    description: "Up to two per committee; initiative and resolution contribution.",
    scope: "committee",
  },
  {
    id: "committee_best_position_paper",
    label: "Best Position Paper (committee)",
    description: "Strongest committee-level position paper.",
    scope: "committee",
  },
];

export function awardCategoryMeta(id: string) {
  return AWARD_CATEGORIES.find((c) => c.id === id);
}
