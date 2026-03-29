/** Curated official UN & system links (inspired by [SEAMUNs Dashboard](https://thedashboard.seamuns.site/) home). */

export type OfficialLinkGroup = {
  title: string;
  links: { label: string; href: string }[];
};

export const OFFICIAL_UN_LINK_GROUPS: OfficialLinkGroup[] = [
  {
    title: "Documents & articles",
    links: [
      { label: "UN Official Document System (ODS)", href: "https://documents.un.org/" },
      { label: "UN Digital Library", href: "https://digitallibrary.un.org/" },
      { label: "UN News", href: "https://news.un.org/" },
      { label: "UN Yearbook", href: "https://www.un.org/en/yearbook/" },
      { label: "UN Press", href: "https://press.un.org/" },
    ],
  },
  {
    title: "Legislation & treaties",
    links: [
      { label: "UN Treaty Collection", href: "https://treaties.un.org/" },
      { label: "UN Audiovisual Library of International Law", href: "https://legal.un.org/avl/" },
      { label: "UNCITRAL (International Trade Law)", href: "https://uncitral.un.org/" },
      { label: "UN Charter", href: "https://www.un.org/en/about-us/un-charter" },
    ],
  },
  {
    title: "Main bodies",
    links: [
      { label: "UN General Assembly", href: "https://www.un.org/ga/" },
      { label: "UN Security Council", href: "https://www.un.org/securitycouncil/" },
      { label: "UN ECOSOC", href: "https://www.un.org/ecosoc/" },
      { label: "International Court of Justice (ICJ)", href: "https://www.icj-cij.org/" },
      { label: "UN Secretariat", href: "https://www.un.org/sg/" },
      { label: "UN Trusteeship Council", href: "https://www.un.org/en/about-us/trusteeship-council" },
    ],
  },
  {
    title: "Programmes & funds",
    links: [
      { label: "UNDP", href: "https://www.undp.org/" },
      { label: "UNICEF", href: "https://www.unicef.org/" },
      { label: "UNHCR", href: "https://www.unhcr.org/" },
      { label: "WFP (World Food Programme)", href: "https://www.wfp.org/" },
      { label: "UNFPA", href: "https://www.unfpa.org/" },
      { label: "UN Environment Programme (UNEP)", href: "https://www.unep.org/" },
      { label: "UN Women", href: "https://www.unwomen.org/" },
      { label: "UN-Habitat", href: "https://unhabitat.org/" },
    ],
  },
  {
    title: "Specialized agencies & related",
    links: [
      { label: "WHO", href: "https://www.who.int/" },
      { label: "UNESCO", href: "https://www.unesco.org/" },
      { label: "IOM (International Organization for Migration)", href: "https://www.iom.int/" },
      { label: "UN Office on Drugs and Crime (UNODC)", href: "https://www.unodc.org/" },
      { label: "UN Office for Disarmament Affairs (UNODA)", href: "https://www.un.org/disarmament/" },
      { label: "UN Human Rights (OHCHR)", href: "https://www.ohchr.org/" },
      { label: "World Bank", href: "https://www.worldbank.org/" },
      { label: "IMF", href: "https://www.imf.org/" },
      { label: "ILO", href: "https://www.ilo.org/" },
      { label: "FAO", href: "https://www.fao.org/" },
    ],
  },
  {
    title: "Peacekeeping & missions",
    links: [
      { label: "UN Peacekeeping", href: "https://peacekeeping.un.org/" },
      { label: "UN Peacekeeping – current missions", href: "https://peacekeeping.un.org/en/missions" },
      { label: "UN Special Political Missions", href: "https://dppa.un.org/en/special-political-missions" },
    ],
  },
  {
    title: "Founders & members",
    links: [
      { label: "UN Member States", href: "https://www.un.org/en/about-us/member-states" },
      { label: "UN System (founders & members)", href: "https://www.un.org/en/about-us/un-system" },
      { label: "UN History", href: "https://www.un.org/en/about-us/history" },
    ],
  },
];
