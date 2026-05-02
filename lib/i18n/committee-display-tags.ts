import type { CommitteeAgeRangeKey, CommitteeDisplayTags } from "@/lib/committee-card-display";

export function translateCommitteeTagDifficulty(
  level: CommitteeDisplayTags["difficulty"],
  t: (key: string) => string
): string {
  switch (level) {
    case "Beginner":
      return t("difficultyBeginner");
    case "Intermediate":
      return t("difficultyIntermediate");
    case "Advanced":
      return t("difficultyAdvanced");
    default:
      return level;
  }
}

export function translateCommitteeTagFormat(
  format: CommitteeDisplayTags["format"],
  t: (key: string) => string
): string {
  return format === "Traditional" ? t("formatTraditional") : t("formatCrisis");
}

export function translateCommitteeTagAgeRange(
  key: CommitteeAgeRangeKey,
  t: (key: string) => string
): string {
  return key === "grade7_12_year8_13" ? t("ageRangeGrade7Year8") : t("ageRangeGrade9Year10");
}
