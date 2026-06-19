import { resolveCommitteeDisplayTags } from "@/lib/committee-card-display";
import { compareCommitteeRowsByDifficultyThenLabel } from "@/lib/committee-difficulty-sort";

export const ADVISOR_DIFFICULTY_SECTION_ORDER = ["Beginner", "Intermediate", "Advanced"] as const;
export type AdvisorDifficultyLevel = (typeof ADVISOR_DIFFICULTY_SECTION_ORDER)[number];
export type AdvisorDifficultySection = AdvisorDifficultyLevel | null;

export type AdvisorCommitteeGroup<T> = {
  committee: string;
  items: T[];
};

export type AdvisorDifficultyGroup<T> = {
  difficulty: AdvisorDifficultySection;
  committees: AdvisorCommitteeGroup<T>[];
};

function difficultyBucketKey(committee: string | null | undefined): AdvisorDifficultyLevel | "other" {
  return resolveCommitteeDisplayTags(committee)?.difficulty ?? "other";
}

function groupByCommittee<T>(
  items: T[],
  getCommittee: (item: T) => string | null | undefined,
  getSortLabel: (item: T) => string
): AdvisorCommitteeGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const committee = getCommittee(item)?.trim() || "—";
    const bucket = map.get(committee) ?? [];
    bucket.push(item);
    map.set(committee, bucket);
  }

  return [...map.entries()]
    .map(([committee, committeeItems]) => ({
      committee,
      items: [...committeeItems].sort((a, b) =>
        getSortLabel(a).localeCompare(getSortLabel(b), undefined, { sensitivity: "base" })
      ),
    }))
    .sort((a, b) =>
      compareCommitteeRowsByDifficultyThenLabel({ committee: a.committee }, { committee: b.committee })
    );
}

/** Beginner → Intermediate → Advanced; within each, committees then delegate labels. */
export function groupAdvisorDelegatesByDifficultyAndCommittee<T>(
  items: T[],
  opts: {
    getCommittee: (item: T) => string | null | undefined;
    getSortLabel?: (item: T) => string;
  }
): AdvisorDifficultyGroup<T>[] {
  const getSortLabel = opts.getSortLabel ?? (() => "");
  const byDifficulty = new Map<AdvisorDifficultyLevel | "other", T[]>();

  for (const item of items) {
    const key = difficultyBucketKey(opts.getCommittee(item));
    const bucket = byDifficulty.get(key) ?? [];
    bucket.push(item);
    byDifficulty.set(key, bucket);
  }

  const sections: AdvisorDifficultyGroup<T>[] = [];

  for (const level of ADVISOR_DIFFICULTY_SECTION_ORDER) {
    const levelItems = byDifficulty.get(level);
    if (!levelItems?.length) continue;
    sections.push({
      difficulty: level,
      committees: groupByCommittee(levelItems, opts.getCommittee, getSortLabel),
    });
  }

  const otherItems = byDifficulty.get("other");
  if (otherItems?.length) {
    sections.push({
      difficulty: null,
      committees: groupByCommittee(otherItems, opts.getCommittee, getSortLabel),
    });
  }

  return sections;
}
