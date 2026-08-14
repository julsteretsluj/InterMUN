// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Curated official links by category.
 * Labels resolve via next-intl (`officialLinks.groups.*`, `officialLinks.categoryHints.*`,
 * `officialLinks.links.*`, optional `officialLinks.linkDescriptions.*`).
 *
 * SEAMUN main site + role-aware committee portals come from `lib/seamun-conference-links`.
 */

import { SEAMUN_SITE_URL } from "@/lib/seamun-conference-links";
import { pressCorpsOfficialLinks } from "@/lib/press-corps-official-links";

export type OfficialLinkDef = {
  linkKey: string;
  href: string;
  /** Optional i18n key under `officialLinks.linkDescriptions.*`. */
  descriptionKey?: string;
  /** Literal title (skips `officialLinks.links.*`). */
  title?: string;
  /** Group heading on the category library (e.g. Press Corps outlet). */
  group?: string;
};

export type OfficialLinkCategoryDef = {
  /** URL slug under `/official-links/[category]`. */
  id: string;
  /** i18n key under `officialLinks.groups.*`. */
  labelKey: string;
  /** i18n key under `officialLinks.categoryHints.*`. */
  hintKey: string;
  emoji?: string;
  links: OfficialLinkDef[];
};

export const OFFICIAL_LINK_CATEGORIES: OfficialLinkCategoryDef[] = [
  {
    id: "seamun",
    labelKey: "seamun",
    hintKey: "seamun",
    emoji: "🌏",
    links: [
      {
        linkKey: "seamunWebsite",
        href: SEAMUN_SITE_URL,
        descriptionKey: "seamunWebsite",
      },
    ],
  },
  {
    id: "press-corps-links",
    labelKey: "pressCorpsLinks",
    hintKey: "pressCorpsLinks",
    emoji: "📰",
    links: pressCorpsOfficialLinks(),
  },
  {
    id: "documents-articles",
    labelKey: "documentsArticles",
    hintKey: "documentsArticles",
    emoji: "📄",
    links: [
      { linkKey: "ods", href: "https://documents.un.org/" },
      { linkKey: "digitalLibrary", href: "https://digitallibrary.un.org/" },
      { linkKey: "unNews", href: "https://news.un.org/" },
      { linkKey: "yearbook", href: "https://www.un.org/en/yearbook/" },
      { linkKey: "unPress", href: "https://press.un.org/" },
    ],
  },
  {
    id: "legislation-treaties",
    labelKey: "legislationTreaties",
    hintKey: "legislationTreaties",
    emoji: "⚖️",
    links: [
      { linkKey: "treatyCollection", href: "https://treaties.un.org/" },
      { linkKey: "avl", href: "https://legal.un.org/avl/" },
      { linkKey: "uncitral", href: "https://uncitral.un.org/" },
      { linkKey: "charter", href: "https://www.un.org/en/about-us/un-charter" },
    ],
  },
  {
    id: "main-bodies",
    labelKey: "mainBodies",
    hintKey: "mainBodies",
    emoji: "🏛️",
    links: [
      { linkKey: "ga", href: "https://www.un.org/ga/" },
      { linkKey: "sc", href: "https://www.un.org/securitycouncil/" },
      { linkKey: "ecosoc", href: "https://www.un.org/ecosoc/" },
      { linkKey: "icj", href: "https://www.icj-cij.org/" },
      { linkKey: "secretariat", href: "https://www.un.org/sg/" },
      { linkKey: "trusteeship", href: "https://www.un.org/en/about-us/trusteeship-council" },
    ],
  },
  {
    id: "programmes-funds",
    labelKey: "programmesFunds",
    hintKey: "programmesFunds",
    emoji: "🌐",
    links: [
      { linkKey: "undp", href: "https://www.undp.org/" },
      { linkKey: "unicef", href: "https://www.unicef.org/" },
      { linkKey: "unhcr", href: "https://www.unhcr.org/" },
      { linkKey: "wfp", href: "https://www.wfp.org/" },
      { linkKey: "unfpa", href: "https://www.unfpa.org/" },
      { linkKey: "unep", href: "https://www.unep.org/" },
      { linkKey: "unwomen", href: "https://www.unwomen.org/" },
      { linkKey: "unhabitat", href: "https://unhabitat.org/" },
    ],
  },
  {
    id: "specialized-agencies",
    labelKey: "specializedAgencies",
    hintKey: "specializedAgencies",
    emoji: "🏢",
    links: [
      { linkKey: "who", href: "https://www.who.int/" },
      { linkKey: "unesco", href: "https://www.unesco.org/" },
      { linkKey: "iom", href: "https://www.iom.int/" },
      { linkKey: "unodc", href: "https://www.unodc.org/" },
      { linkKey: "unoda", href: "https://www.un.org/disarmament/" },
      { linkKey: "ohchr", href: "https://www.ohchr.org/" },
      { linkKey: "worldbank", href: "https://www.worldbank.org/" },
      { linkKey: "imf", href: "https://www.imf.org/" },
      { linkKey: "ilo", href: "https://www.ilo.org/" },
      { linkKey: "fao", href: "https://www.fao.org/" },
    ],
  },
  {
    id: "peacekeeping-missions",
    labelKey: "peacekeepingMissions",
    hintKey: "peacekeepingMissions",
    emoji: "🕊️",
    links: [
      { linkKey: "peacekeeping", href: "https://peacekeeping.un.org/" },
      { linkKey: "peacekeepingCurrent", href: "https://peacekeeping.un.org/en/missions" },
      { linkKey: "spm", href: "https://dppa.un.org/en/special-political-missions" },
    ],
  },
  {
    id: "founders-members",
    labelKey: "foundersMembers",
    hintKey: "foundersMembers",
    emoji: "🗺️",
    links: [
      { linkKey: "memberStates", href: "https://www.un.org/en/about-us/member-states" },
      { linkKey: "unSystem", href: "https://www.un.org/en/about-us/un-system" },
      { linkKey: "history", href: "https://www.un.org/en/about-us/history" },
    ],
  },
];

/** @deprecated Prefer `OFFICIAL_LINK_CATEGORIES`. Kept for any lingering imports. */
export type OfficialLinkGroupDef = {
  groupKey: string;
  links: { linkKey: string; href: string }[];
};

/** @deprecated Prefer `OFFICIAL_LINK_CATEGORIES`. */
export const OFFICIAL_UN_LINK_GROUPS_DEF: OfficialLinkGroupDef[] =
  OFFICIAL_LINK_CATEGORIES.map((category) => ({
    groupKey: category.labelKey,
    links: category.links.map(({ linkKey, href }) => ({ linkKey, href })),
  }));

export function getOfficialLinkCategory(
  categoryId: string
): OfficialLinkCategoryDef | undefined {
  return OFFICIAL_LINK_CATEGORIES.find((category) => category.id === categoryId);
}

/**
 * Resolve a category, appending the role-aware SEAMUN committee portal when provided.
 */
export function resolveOfficialLinkCategory(
  categoryId: string,
  opts?: { committeeSiteUrl?: string | null }
): OfficialLinkCategoryDef | undefined {
  const category = getOfficialLinkCategory(categoryId);
  if (!category) return undefined;
  if (category.id !== "seamun") return category;

  const committeeSiteUrl = opts?.committeeSiteUrl?.trim();
  if (!committeeSiteUrl) return category;

  return {
    ...category,
    links: [
      ...category.links,
      {
        linkKey: "seamunCommittee",
        href: committeeSiteUrl,
        descriptionKey: "seamunCommittee",
      },
    ],
  };
}

export function isOfficialLinkCategoryId(value: string): boolean {
  return OFFICIAL_LINK_CATEGORIES.some((category) => category.id === value);
}

/** Display link count on hub cards (SEAMUN may grow when a committee portal applies). */
export function officialLinkCategoryDisplayCount(
  category: OfficialLinkCategoryDef,
  opts?: { committeeSiteUrl?: string | null }
): number {
  if (category.id === "seamun" && opts?.committeeSiteUrl) {
    return category.links.length + 1;
  }
  return category.links.length;
}
