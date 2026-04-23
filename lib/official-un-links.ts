/** Curated official UN & system links — labels resolved via next-intl (`officialLinks.groups.*`, `officialLinks.links.*`). */

export type OfficialLinkGroupDef = {
  groupKey:
    | "documentsArticles"
    | "legislationTreaties"
    | "mainBodies"
    | "programmesFunds"
    | "specializedAgencies"
    | "peacekeepingMissions"
    | "foundersMembers";
  links: { linkKey: string; href: string }[];
};

export const OFFICIAL_UN_LINK_GROUPS_DEF: OfficialLinkGroupDef[] = [
  {
    groupKey: "documentsArticles",
    links: [
      { linkKey: "ods", href: "https://documents.un.org/" },
      { linkKey: "digitalLibrary", href: "https://digitallibrary.un.org/" },
      { linkKey: "unNews", href: "https://news.un.org/" },
      { linkKey: "yearbook", href: "https://www.un.org/en/yearbook/" },
      { linkKey: "unPress", href: "https://press.un.org/" },
    ],
  },
  {
    groupKey: "legislationTreaties",
    links: [
      { linkKey: "treatyCollection", href: "https://treaties.un.org/" },
      { linkKey: "avl", href: "https://legal.un.org/avl/" },
      { linkKey: "uncitral", href: "https://uncitral.un.org/" },
      { linkKey: "charter", href: "https://www.un.org/en/about-us/un-charter" },
    ],
  },
  {
    groupKey: "mainBodies",
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
    groupKey: "programmesFunds",
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
    groupKey: "specializedAgencies",
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
    groupKey: "peacekeepingMissions",
    links: [
      { linkKey: "peacekeeping", href: "https://peacekeeping.un.org/" },
      { linkKey: "peacekeepingCurrent", href: "https://peacekeeping.un.org/en/missions" },
      { linkKey: "spm", href: "https://dppa.un.org/en/special-political-missions" },
    ],
  },
  {
    groupKey: "foundersMembers",
    links: [
      { linkKey: "memberStates", href: "https://www.un.org/en/about-us/member-states" },
      { linkKey: "unSystem", href: "https://www.un.org/en/about-us/un-system" },
      { linkKey: "history", href: "https://www.un.org/en/about-us/history" },
    ],
  },
];
