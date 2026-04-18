/**
 * Standard MUN-style award categories. `scope` drives which fields are required in the chair UI.
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
    label: "Best Delegate (Trophy)",
    description:
      "Overall trophy winner for the strongest delegate across the full conference.",
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
    label: "Honorable Mention — Chair",
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
    label: "Honorable Mention (committee)",
    description: "Up to two per committee.",
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

/**
 * Some datasets include the overall event name as a `conferences` row (e.g. seed branding).
 * It must not appear as a selectable committee session (matches allocation matrix filtering).
 */
export function isConferenceEventPlaceholderRow(c: {
  name: string | null;
  committee: string | null;
}): boolean {
  const name = c.name?.trim().toLowerCase();
  const committee = c.committee?.trim().toLowerCase();
  return name === "seamun i 2027" || committee === "seamun i 2027";
}
