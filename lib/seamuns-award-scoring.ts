/**
 * Award rubrics aligned with [SEAMUNs Chair dashboard — Score](https://thedashboard.seamuns.site/chair/awards):
 * four proficiency bands (Beginning / Developing / Proficient / Exemplary), stored as 2 / 4 / 6 / 8
 * to stay compatible with the legacy 1–8 scale in `award_nominations.rubric_scores`.
 */

export type ProficiencyBandId = "beginning" | "developing" | "proficient" | "exemplary";

export const PROFICIENCY_BAND_ORDER: ProficiencyBandId[] = [
  "beginning",
  "developing",
  "proficient",
  "exemplary",
];

export const PROFICIENCY_BAND_LABEL: Record<ProficiencyBandId, string> = {
  beginning: "Beginning",
  developing: "Developing",
  proficient: "Proficient",
  exemplary: "Exemplary",
};

/** Representative score per band for DB storage (mid of each 1–2 / 3–4 / 5–6 / 7–8 pair). */
export const BAND_STORED_SCORE: Record<ProficiencyBandId, number> = {
  beginning: 2,
  developing: 4,
  proficient: 6,
  exemplary: 8,
};

/** Low / high within each SEAMUNs band maps to the 1–8 scale (odd = low, even = high). */
export type BandTier = "low" | "high";

const BAND_PAIR_BASE: Record<ProficiencyBandId, number> = {
  beginning: 0,
  developing: 2,
  proficient: 4,
  exemplary: 6,
};

export function bandScoreRange(band: ProficiencyBandId): { low: number; high: number } {
  const b = BAND_PAIR_BASE[band];
  return { low: b + 1, high: b + 2 };
}

export function bandAndTierToScore(band: ProficiencyBandId, tier: BandTier): number {
  return BAND_PAIR_BASE[band] + (tier === "low" ? 1 : 2);
}

/** Map a stored 1–8 score to band + low/high tier. */
export function scoreToBandAndTier(score: number): { band: ProficiencyBandId; tier: BandTier } | null {
  if (!Number.isFinite(score) || score < 1 || score > 8) return null;
  const tier: BandTier = score % 2 === 1 ? "low" : "high";
  const band: ProficiencyBandId =
    score <= 2 ? "beginning" : score <= 4 ? "developing" : score <= 6 ? "proficient" : "exemplary";
  return { band, tier };
}

export function parseTierId(raw: string): BandTier | null {
  const t = raw.trim().toLowerCase();
  if (t === "low" || t === "high") return t;
  return null;
}

export type NominationRubricType =
  | "committee_best_delegate"
  | "committee_honourable_mention"
  | "committee_best_position_paper"
  | "conference_best_delegate";

export type RubricCriterion = {
  key: string;
  label: string;
  /** Descriptions for Beginning, Developing, Proficient, Exemplary (SEAMUNs-style guide). */
  bandDescriptions: [string, string, string, string];
};

export const RUBRIC_KEYS_BY_NOMINATION: Record<NominationRubricType, string[]> = {
  committee_best_delegate: [
    "creativity",
    "diplomacy",
    "collaboration",
    "leadership",
    "knowledge_research",
    "participation",
  ],
  committee_honourable_mention: [
    "creativity",
    "diplomacy",
    "collaboration",
    "leadership",
    "knowledge_research",
    "participation",
  ],
  conference_best_delegate: [
    "creativity",
    "diplomacy",
    "collaboration",
    "leadership",
    "knowledge_research",
    "participation",
  ],
  committee_best_position_paper: [
    "research_depth",
    "country_stance_alignment",
    "policy_accuracy",
    "proposed_solutions",
    "formatting_style_citations",
  ],
};

// SEAMUN I 2027–style criteria text (four bands per criterion).
export const DELEGATE_CRITERIA: RubricCriterion[] = [
  {
    key: "creativity",
    label: "Creativity",
    bandDescriptions: [
      `Proposes repetitive or standard solutions; rarely thinks outside the existing framework.`,
      `Offers some original ideas but struggles to adapt them to changing committee dynamics.`,
      `Frequently suggests innovative solutions and unique clauses for draft resolutions.`,
      `Highly creative; develops "game-changing" compromises that bridge clashing blocs.`,
    ],
  },
  {
    key: "diplomacy",
    label: "Diplomacy",
    bandDescriptions: [
      `Lacks professional decorum; occasionally dismissive of other delegates' viewpoints.`,
      `Respectful but unremarkable; maintains a neutral presence without building rapport.`,
      `Consistently professional; actively seeks to understand and incorporate opposing views.`,
      `Exemplifies true statesmanship; commands respect while remaining humble and inclusive.`,
    ],
  },
  {
    key: "collaboration",
    label: "Collaboration",
    bandDescriptions: [
      `Works in isolation or refuses to compromise on minor details; disrupts group work.`,
      `Contributes to a bloc but does not take an active role in drafting or merging ideas.`,
      `A strong team player; helps merge resolutions and ensures all bloc members have a voice.`,
      `The "glue" of the committee brings disparate groups together and facilitates consensus.`,
    ],
  },
  {
    key: "leadership",
    label: "Leadership",
    bandDescriptions: [
      `Passive; waits for others to initiate motions or start discussions during caucuses.`,
      `Shows leadership in small groups but is hesitant to lead the house or present for the bloc.`,
      `Takes clear initiative; leads unmoderated caucuses and manages the drafting process.`,
      `Visionary leader; sets the tone for the room and inspires others through action and guidance.`,
    ],
  },
  {
    key: "knowledge_research",
    label: "Knowledge and Research",
    bandDescriptions: [
      `Frequently confused by the topic; relies on generalities rather than specific facts.`,
      `Has a basic understanding of the agenda but misses technical or legal nuances.`,
      `Demonstrates strong command of the topic; cites relevant stats and UN past actions.`,
      `Expert-level mastery; uses deep research to navigate technical debates and debunk false info.`,
    ],
  },
  {
    key: "participation",
    label: "Participation",
    bandDescriptions: [
      `Rarely speaks; frequently absent during caucusing or inactive during voting.`,
      `Speaks occasionally in moderated caucuses; participates only when prompted.`,
      `Consistently active in all sessions; frequently raises motions and contributes to the floor.`,
      `Necessary and consistent presence; engages in every aspect of the debate from start to finish.`,
    ],
  },
];

export const PAPER_CRITERIA: RubricCriterion[] = [
  {
    key: "research_depth",
    label: "Research Depth",
    bandDescriptions: [
      `Minimal data; lacks specific UN resolutions, treaty citations, or historical context.`,
      `Basic data provided; mentions well-known treaties but lacks specific localised evidence.`,
      `Strong research; includes relevant stats, past UN actions, and committee-specific history.`,
      `Exceptional depth; identifies niche legal loopholes, specific funding gaps, or rare data points.`,
    ],
  },
  {
    key: "country_stance_alignment",
    label: "Country Stance Alignment",
    bandDescriptions: [
      `Frequently contradicts the assigned country's real-world geopolitical interests or voting history.`,
      `Generally follows policy but lacks clarity on sensitive or controversial national stances.`,
      `Consistently accurate; clearly reflects the nation's strategic regional and global interests.`,
      `Highly nuanced; addresses complex regional dynamics and clearly defines national "red lines."`,
    ],
  },
  {
    key: "policy_accuracy",
    label: "Policy Accuracy",
    bandDescriptions: [
      `Fundamental misunderstanding of the topic's legal framework or the committee's mandate.`,
      `Understands the general topic but misses technical or legal complexities within current policy.`,
      `Solid grasp of complex policy issues (e.g., specific clauses in international law).`,
      `Expert-level accuracy; integrates technical facts to build a sophisticated policy argument.`,
    ],
  },
  {
    key: "proposed_solutions",
    label: "Proposed Solutions",
    bandDescriptions: [
      `Vague or non-actionable (e.g., "countries should talk more"). No implementation plan.`,
      `Generic solutions; lack details on funding, specific UN agencies, or feasibility.`,
      `Innovative and actionable; proposes specific mechanisms, task forces, or monitoring bodies.`,
      `Sophisticated and holistic; solutions are original, feasible, and legally sound with clear timelines.`,
    ],
  },
  {
    key: "formatting_style_citations",
    label: "Formatting, Style and Citations",
    bandDescriptions: [
      `Significant errors in UN citation style (e.g., Chicago/APA); unprofessional tone.`,
      `Standard formatting, but contains several grammatical gaps or inconsistent citation styles.`,
      `Professional UN academic formatting; clear, concise, and persuasive diplomatic language.`,
      `Flawless UN academic style; compelling narrative and perfect citation of all sources.`,
    ],
  },
];

export function criteriaForNominationType(type: NominationRubricType): RubricCriterion[] {
  if (type === "committee_best_position_paper") return PAPER_CRITERIA;
  return DELEGATE_CRITERIA;
}

export function maxRubricTotal(type: NominationRubricType): number {
  return RUBRIC_KEYS_BY_NOMINATION[type].length * 8;
}

export function scoreToBand(score: number): ProficiencyBandId | null {
  if (!Number.isFinite(score) || score < 1 || score > 8) return null;
  if (score <= 2) return "beginning";
  if (score <= 4) return "developing";
  if (score <= 6) return "proficient";
  return "exemplary";
}

export function parseBandId(raw: string): ProficiencyBandId | null {
  const t = raw.trim().toLowerCase();
  if (
    t === "beginning" ||
    t === "developing" ||
    t === "proficient" ||
    t === "exemplary"
  ) {
    return t;
  }
  return null;
}

/** Compact summary for SMT tables, e.g. "B/D/P/E/P/E" */
export function rubricBandInitials(scores: Record<string, number> | null, type: NominationRubricType): string {
  if (!scores) return "—";
  const keys = RUBRIC_KEYS_BY_NOMINATION[type];
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

export function rubricNumericTotal(scores: Record<string, number> | null, type: NominationRubricType): number {
  if (!scores) return 0;
  return RUBRIC_KEYS_BY_NOMINATION[type].reduce((sum, key) => sum + Number(scores[key] ?? 0), 0);
}
