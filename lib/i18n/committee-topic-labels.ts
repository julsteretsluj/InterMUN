type Translator = {
  (key: string): string;
  has?: (key: string) => boolean;
};

function slugifyLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const COMMITTEE_LABEL_KEY_BY_SLUG: Record<string, string> = {
  african_union: "AFRICAN_UNION",
  arab_league: "ARAB_LEAGUE",
  asean: "ASEAN",
  ccpcj: "CCPCJ",
  disec: "DISEC",
  ecofin: "ECOFIN",
  ecosoc: "ECOSOC",
  eu: "EU",
  f1: "F1",
  fifa: "FIFA",
  fantasy_world_committee: "FANTASY_WORLD_COMMITTEE",
  hsc: "HSC",
  hrc: "HRC",
  hcr: "HCR",
  iaea: "IAEA",
  icao: "ICAO",
  icc: "ICC",
  icj: "ICJ",
  interpol: "INTERPOL",
  iopc: "IOPC",
  nato: "NATO",
  press_corps: "PRESS_CORPS",
  us_senate: "US_SENATE",
  sochum: "SOCHUM",
  specpol: "SPECPOL",
  csa: "CSA",
  undp: "UNDP",
  unep: "UNEP",
  unesco: "UNESCO",
  unicef: "UNICEF",
  unodc: "UNODC",
  unsc: "UNSC",
  who: "WHO",
  wipo: "WIPO",
  wto: "WTO",
  un_women: "UN_WOMEN",
  unwomen: "UN_WOMEN",
};

const TOPIC_KEY_BY_SLUG: Record<string, string> = {
  climate_action: "climateAction",
  climate_change: "climateChange",
  cyber_security: "cyberSecurity",
  ai_governance: "aiGovernance",
  disarmament: "disarmament",
  non_proliferation: "nonProliferation",
  refugee_protection: "refugeeProtection",
  global_health: "globalHealth",
  food_security: "foodSecurity",
  human_rights: "humanRights",
  peacekeeping: "peacekeeping",
  disinformation: "disinformation",
  sustainable_development: "sustainableDevelopment",
  untitled_topic: "untitledTopic",
  how_can_member_states_strengthen_global_cooperation_on_climate_action:
    "qClimateCooperation",
  how_can_the_international_community_improve_access_to_quality_healthcare:
    "qGlobalHealthcareAccess",
  how_should_states_regulate_ai_and_emerging_technologies:
    "qAiGovernance",
  what_measures_can_reduce_the_global_impact_of_disinformation:
    "qDisinformationImpact",
  how_can_countries_balance_security_and_human_rights_in_counter_terrorism:
    "qSecurityHumanRights",
  how_can_the_un_system_support_refugee_protection_and_durable_solutions:
    "qRefugeeProtection",
  what_strategies_can_improve_food_security_in_climate_vulnerable_regions:
    "qFoodSecurity",
  how_should_the_international_community_prevent_nuclear_proliferation:
    "qNonProliferation",
};

export function translateCommitteeLabel(
  tCommitteeLabels: Translator,
  rawLabel: string | null | undefined
): string {
  const raw = rawLabel?.trim();
  if (!raw) return "";
  const slug = slugifyLabel(raw);
  const key = COMMITTEE_LABEL_KEY_BY_SLUG[slug];
  if (!key) return raw;
  if (typeof tCommitteeLabels.has === "function" && !tCommitteeLabels.has(key)) return raw;
  return tCommitteeLabels(key);
}

export function translateAgendaTopicLabel(
  tAgendaTopics: Translator,
  rawLabel: string | null | undefined
): string {
  const raw = rawLabel?.trim();
  if (!raw) return "";
  const slug = slugifyLabel(raw);
  const key = TOPIC_KEY_BY_SLUG[slug];
  if (!key) return raw;
  if (typeof tAgendaTopics.has === "function" && !tAgendaTopics.has(key)) return raw;
  return tAgendaTopics(key);
}
