import type { AwardScope } from "@/lib/awards";
import {
  BEST_COMMITTEE_RUBRIC,
  CHAIR_PERFORMANCE_RUBRIC,
  CHAIR_REPORT_OVERALL_RUBRIC,
  CHAIR_REPORT_SECTION_RUBRIC,
} from "@/lib/seamun-awards-rubric-guide";
import {
  DELEGATE_CRITERIA,
  PAPER_CRITERIA,
  PROFICIENCY_BAND_LABEL,
  type RubricCriterion,
  scoreToBand,
} from "@/lib/seamuns-award-scoring";

/** Award `category` ids that use individual rubric scoring in the SMT manager (excludes committee-scoped rows). */
export function awardCategoryUsesSmtRubric(categoryId: string): boolean {
  return rubricCriteriaForAwardAssignmentCategory(categoryId) !== null;
}

export function rubricCriteriaForAwardAssignmentCategory(categoryId: string): RubricCriterion[] | null {
  switch (categoryId) {
    case "conference_best_delegate":
      return DELEGATE_CRITERIA;
    case "conference_best_position_paper":
      return PAPER_CRITERIA;
    case "best_chair":
    case "honourable_mention_chair":
      return CHAIR_PERFORMANCE_RUBRIC;
    case "best_committee":
      return BEST_COMMITTEE_RUBRIC;
    case "best_chair_report":
      return [...CHAIR_REPORT_OVERALL_RUBRIC, ...CHAIR_REPORT_SECTION_RUBRIC];
    default:
      return null;
  }
}

export function rubricKeysForAwardAssignmentCategory(categoryId: string): string[] {
  return rubricCriteriaForAwardAssignmentCategory(categoryId)?.map((c) => c.key) ?? [];
}

export function maxRubricPointsForAwardCategory(categoryId: string): number {
  const keys = rubricKeysForAwardAssignmentCategory(categoryId);
  return keys.length * 8;
}

export function rubricBandInitialsForAssignment(
  scores: Record<string, number> | null | undefined,
  categoryId: string
): string {
  const keys = rubricKeysForAwardAssignmentCategory(categoryId);
  if (!scores || keys.length === 0) return "—";
  const parts: string[] = [];
  for (const key of keys) {
    const band = scoreToBand(Number(scores[key] ?? 0));
    if (!band) {
      parts.push("?");
      continue;
    }
    parts.push(PROFICIENCY_BAND_LABEL[band].charAt(0).toUpperCase());
  }
  return parts.join("/");
}

export function rubricNumericTotalForAssignment(
  scores: Record<string, number> | null | undefined,
  categoryId: string
): number {
  const keys = rubricKeysForAwardAssignmentCategory(categoryId);
  if (!keys.length) return 0;
  return keys.reduce((sum, key) => sum + Number(scores?.[key] ?? 0), 0);
}

/** Committee-scoped awards are approval-only in SMT (no rubric matrix here). */
export function smtShouldCollectRubric(scope: AwardScope | undefined, categoryId: string): boolean {
  if (scope === "committee") return false;
  return awardCategoryUsesSmtRubric(categoryId);
}
