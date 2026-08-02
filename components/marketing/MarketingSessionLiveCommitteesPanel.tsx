// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import {
  formatCommitteeCardTitle,
  resolveCommitteeDisplayTags,
  resolveCommitteeFullName,
} from "@/lib/committee-card-display";
import {
  ageRangeTagClass,
  difficultyTagClass,
  eslFriendlyTagClass,
  formatTagClass,
  lightLockedTagClass,
} from "@/lib/committee-tag-styles";
import {
  translateCommitteeTagAgeRange,
  translateCommitteeTagDifficulty,
  translateCommitteeTagFormat,
} from "@/lib/i18n/committee-display-tags";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";
import { cn } from "@/lib/utils";

type CommitteeFixture = {
  id: string;
  committee: string;
  committeeCode: string;
  chairNames: string;
  topics: string[];
};

const FIXTURE_SECTIONS: { difficulty: "Beginner" | "Intermediate" | "Advanced"; items: CommitteeFixture[] }[] = [
  {
    difficulty: "Beginner",
    items: [
      {
        id: "ecosoc",
        committee: "ECOSOC",
        committeeCode: "ECOSOC",
        chairNames: "Alex M., Jordan K.",
        topics: ["Food security and sustainable agriculture"],
      },
      {
        id: "press",
        committee: "PRESS CORPS",
        committeeCode: "PRESS CORPS",
        chairNames: "Sam R.",
        topics: ["Conference-wide reporting"],
      },
    ],
  },
  {
    difficulty: "Intermediate",
    items: [
      {
        id: "unhrc",
        committee: "UNHRC",
        committeeCode: "UNHRC",
        chairNames: "Priya S., Marco L.",
        topics: ["Freedom of expression in conflict zones"],
      },
    ],
  },
  {
    difficulty: "Advanced",
    items: [
      {
        id: "who",
        committee: "WHO",
        committeeCode: "WHO",
        chairNames: "Elena V., Chris T.",
        topics: ["Pandemic preparedness and global health equity"],
      },
    ],
  },
];

const FULL_NAME_KEYS: Record<string, string> = {
  "Disarmament and International Security Committee": "DISEC",
  "Economic and Social Council": "ECOSOC",
  "World Health Organization": "WHO",
  "United Nations Security Council": "UNSC",
  "United Nations Human Rights Council": "UNHRC",
  "United Nations Office on Drugs and Crime": "UNODC",
  "UN Women": "UN_WOMEN",
  INTERPOL: "INTERPOL",
  "Press Corps": "PRESS_CORPS",
};

export function MarketingSessionLiveCommitteesPanel({
  className,
  compactIntro = false,
}: {
  className?: string;
  /** Shorter header when nested in the homepage chamber preview. */
  compactIntro?: boolean;
}) {
  const t = useTranslations("smtOverview");
  const tCommitteeTags = useTranslations("committeeTags");
  const tNames = useTranslations("committeeNames.full");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const [selectedId, setSelectedId] = useState("ecosoc");

  const localizeKnownCommitteeFullName = useCallback(
    (value: string | null | undefined): string | null => {
      const v = value?.trim();
      if (!v) return null;
      const key = FULL_NAME_KEYS[v];
      return key ? tNames(key) : v;
    },
    [tNames]
  );

  const sections = useMemo(() => FIXTURE_SECTIONS, []);
  const itemPriorityById = useMemo(() => {
    const items = sections.flatMap((section) => section.items);
    return new Map(items.map((item, index) => [item.id, index + 1] as const));
  }, [sections]);

  return (
    <section
      className={cn(
        /* marketing-light-surface: lock dark ink inside dark chamber frames (both site themes). */
        "marketing-light-surface max-h-[min(28rem,70vh)] overflow-y-auto rounded-xl border border-zinc-300/80 bg-brand-cream p-4 text-zinc-900 [color-scheme:light] sm:p-6",
        className
      )}
    >
      {!compactIntro ? (
        <>
          <h1 className="mb-1.5 font-sans text-[1.35rem] font-semibold leading-tight text-zinc-900 sm:text-[1.85rem]">
            {t("welcomeSg")}
          </h1>
          <p className="mb-6 text-[0.9rem] text-zinc-700 sm:text-[0.95rem]">{t("whichCommittee")}</p>
        </>
      ) : (
        <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-500">
          {t("whichCommittee")}
        </p>
      )}

      <div className="space-y-6 sm:space-y-8">
        {sections.map((section, sectionIndex) => (
          <section
            key={section.difficulty}
            className={sectionIndex > 0 ? "border-t border-zinc-300/70 pt-6 sm:pt-8" : undefined}
            aria-labelledby={`marketing-smt-difficulty-${section.difficulty}`}
          >
            <div className="mb-3 flex items-center gap-3 sm:mb-4">
              <h2
                id={`marketing-smt-difficulty-${section.difficulty}`}
                className={lightLockedTagClass(difficultyTagClass(section.difficulty))}
              >
                {translateCommitteeTagDifficulty(section.difficulty, tCommitteeTags)}
              </h2>
              <div className="h-px min-w-0 flex-1 bg-zinc-300/80" role="presentation" aria-hidden />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {section.items.map((item) => {
                const cardPriority = itemPriorityById.get(item.id) ?? 1;
                const selected = selectedId === item.id;
                const tags = resolveCommitteeDisplayTags(item.committee);
                const localizedFull = localizeKnownCommitteeFullName(
                  resolveCommitteeFullName(null, item.committee)
                );
                const code = item.committee.trim();
                const title =
                  localizedFull && code
                    ? `${localizedFull} — ${translateCommitteeLabel(tCommitteeLabels, code)}`
                    : translateCommitteeLabel(
                        tCommitteeLabels,
                        formatCommitteeCardTitle(null, item.committee)
                      );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-pressed={selected}
                    aria-label={`${cardPriority}. ${title}`}
                    className={cn(
                      "relative rounded-lg border bg-white px-3.5 py-2.5 text-left text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                      selected
                        ? "border-[color-mix(in_srgb,var(--accent)_45%,#0B1F3A)] bg-[color-mix(in_srgb,var(--accent)_6%,#ffffff)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                        : "border-zinc-200"
                    )}
                  >
                    <p className="text-sm font-semibold leading-snug text-zinc-900">{title}</p>
                    {tags ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className={lightLockedTagClass(formatTagClass(tags.format))}>
                          {translateCommitteeTagFormat(tags.format, tCommitteeTags)}
                        </span>
                        <span className={lightLockedTagClass(ageRangeTagClass())}>
                          {translateCommitteeTagAgeRange(tags.ageRangeKey, tCommitteeTags)}
                        </span>
                        {tags.eslFriendly ? (
                          <span className={lightLockedTagClass(eslFriendlyTagClass(true))}>
                            {t("eslFriendly")}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-1.5 text-xs text-zinc-600">
                      <span className="font-medium text-zinc-800">{t("chairsLabel")} </span>
                      {item.chairNames}
                    </p>
                    <p className="mt-1.5 text-xs font-mono tracking-widest text-zinc-600">
                      {item.committeeCode}
                    </p>
                    <div className="mt-1.5 flow-root">
                      <NavPriorityBadge priority={cardPriority} variant="tile" className="nav-priority-badge--wrap-tile" />
                      {item.topics.length > 0 ? (
                        <ul className="max-h-20 space-y-1 overflow-y-auto">
                          {item.topics.map((topic) => (
                            <li key={topic} className="text-[0.72rem] leading-snug text-zinc-800">
                              <span className="font-semibold text-zinc-900">{t("topicLabel")} </span>
                              {topic}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
