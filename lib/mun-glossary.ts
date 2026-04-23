export type GlossarySource = "core" | "committee" | "topic";

export type GlossaryContext = {
  committeeCode?: string | null;
  committeeLabel?: string | null;
  topicLabels?: string[];
};

export type GlossaryEntry = {
  id: string;
  source: GlossarySource;
};

const CORE_TERMS: string[] = [
  "delegation",
  "placard",
  "dais",
  "quorum",
  "motion",
  "point_of_order",
  "moderated_caucus",
  "unmoderated_caucus",
  "draft_resolution",
  "amendment",
  "operative_clause",
  "preambulatory_clause",
  "right_of_reply",
];

const COMMITTEE_CODE_TERMS: Record<string, string[]> = {
  UNSC: ["veto_power", "chapter_vii", "sanctions_regime"],
  DISEC: ["arms_control", "non_proliferation", "confidence_building_measures"],
  UNHRC: ["universal_periodic_review", "special_rapporteur", "treaty_body"],
  WHO: ["public_health_emergency", "surveillance", "health_systems"],
  UNODC: ["transnational_crime", "illicit_trafficking", "rule_of_law_capacity"],
  ECOSOC: ["sustainable_development", "financing_for_development", "policy_coordination"],
  UNICEF: ["child_protection", "education_access", "humanitarian_response"],
  "UN WOMEN": ["gender_mainstreaming", "gender_based_violence", "economic_empowerment"],
  UNWOMEN: ["gender_mainstreaming", "gender_based_violence", "economic_empowerment"],
  PRESSCORPS: ["source_attribution", "verified_reporting", "editorial_independence"],
  "PRESS CORPS": ["source_attribution", "verified_reporting", "editorial_independence"],
};

const TOPIC_KEYWORD_TERMS: Array<{ keyword: RegExp; terms: string[] }> = [
  { keyword: /climate|warming|emissions|adaptation|mitigation/i, terms: ["climate_mitigation", "climate_adaptation"] },
  { keyword: /cyber|digital|ai|artificial intelligence|critical infrastructure/i, terms: ["cyber_norms", "critical_infrastructure"] },
  { keyword: /pandemic|epidemic|outbreak|public health/i, terms: ["epidemiology", "preparedness_response"] },
  { keyword: /migration|refugee|displacement|asylum/i, terms: ["non_refoulement", "durable_solutions"] },
  { keyword: /nuclear|atomic|radiological/i, terms: ["non_proliferation", "nuclear_safeguards"] },
  { keyword: /terror|extremis/i, terms: ["counter_terrorism", "due_process"] },
  { keyword: /water|food security|agriculture/i, terms: ["resource_security", "resilience"] },
];

function normalizeCommitteeCode(code: string | null | undefined): string | null {
  const v = code?.trim().toUpperCase() ?? "";
  if (!v) return null;
  return v.replace(/\s+/g, " ");
}

export function resolveGlossaryEntries(context: GlossaryContext): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  const seen = new Set<string>();

  const pushMany = (ids: string[], source: GlossarySource) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, source });
    }
  };

  pushMany(CORE_TERMS, "core");

  const normalizedCode = normalizeCommitteeCode(context.committeeCode);
  if (normalizedCode) {
    const committeeTerms = COMMITTEE_CODE_TERMS[normalizedCode];
    if (committeeTerms?.length) pushMany(committeeTerms, "committee");
  }

  for (const label of context.topicLabels ?? []) {
    for (const match of TOPIC_KEYWORD_TERMS) {
      if (!match.keyword.test(label)) continue;
      pushMany(match.terms, "topic");
    }
  }

  return out;
}
