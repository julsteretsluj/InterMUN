import type { RubricCriterion } from "@/lib/seamuns-award-scoring";

/** Column headers aligned with PDF bands (scores stored as 1–8 in nominations). */
export const RUBRIC_BAND_HEADERS = [
  "1–2 (Beginning)",
  "3–4 (Developing)",
  "5–6 (Proficient)",
  "7–8 (Exemplary)",
] as const;

export const SEAMUN_AWARD_OVERVIEW_PARAGRAPHS = [
  "The SEAMUN I Award System recognises diplomatic excellence, academic rigour, and exceptional leadership—not only final debate performance, but research and collaboration behind the scenes.",
];

export const SEAMUN_CONFERENCE_WIDE_AWARDS: { title: string; description: string }[] = [
  {
    title: "Best Delegate",
    description:
      "Individual who consistently leads diplomatic efforts, demonstrates mastery of RoP, and spearheads comprehensive resolutions.",
  },
  {
    title: "Best Position Paper",
    description:
      "Most exceptional pre-conference research—nuanced understanding of foreign policy and the agenda.",
  },
];

export const SEAMUN_COLLECTIVE_CHAIR_AWARDS: { title: string; description: string }[] = [
  {
    title: "Best Chair",
    description: "Impartiality, firm control of the house, and nurturing delegate growth.",
  },
  {
    title: "Honourable Mention Chair",
    description: "Outstanding support and execution on the dais.",
  },
  {
    title: "Best Committee",
    description: "Highest engagement, productivity, and collaborative spirit.",
  },
  {
    title: "Best Chair Report",
    description: "Most comprehensive, accessible, academically sound study guide / chair report.",
  },
];

export const SEAMUN_COMMITTEE_LEVEL_AWARDS: { title: string; description: string }[] = [
  {
    title: "Best Delegate",
    description: "Top delegate in-committee—drove debate and brokered key compromises.",
  },
  {
    title: "Honourable Mention",
    description:
      "Significant initiative, meaningful resolution contribution, active throughout sessions (up to 2 by committee size and difficulty).",
  },
  {
    title: "Best Position Paper",
    description: "Most detailed, policy-accurate committee-level position paper.",
  },
];

export const SEAMUN_AWARDS_PROCESS_SECTIONS: {
  title: string;
  bullets?: string[];
  paragraphs?: string[];
}[] = [
  {
    title: "Scoring framework",
    bullets: [
      "Evaluations follow official SEAMUN I rubrics as the academic baseline.",
      "Quantitative data: chairs and delegates receive numerical values (1–8) across categories (e.g. diplomacy, empathy, research depth).",
      "Weighted averages balance difficulty and consistency across sessions.",
    ],
  },
  {
    title: "Evaluation loop",
    bullets: [
      "Chairs evaluating delegates: a high score alone is not enough—chairs submit a written Statement of Confirmation citing specific on-the-floor evidence.",
      "Delegates evaluating chairs: anonymous chair evaluation (e.g. mid day 2)—rates empathy, fairness, procedural knowledge.",
    ],
  },
  {
    title: "Guide, not decision",
    bullets: [
      "Rubrics identify strongest contenders and technical justification; they do not automatically trigger a win.",
      "Final selection accounts for spirit of the conference and purposeful diplomacy.",
    ],
  },
  {
    title: "Final decisions & Secretariat oversight",
    bullets: [
      "Final authority rests with the Secretary-General(s).",
      "Verification of evidence: Statements of Confirmation cross-referenced with delegate scorecards.",
      "Experience-driven judgement on evidence of impact and the SEAMUN mission.",
      "Statistical ties: final review of position papers and session notes.",
    ],
  },
];

export const SEAMUN_CHAIR_TRAINING_GUIDE: { title: string; bullets: string[] }[] = [
  {
    title: "Applying the 1–8 scale (no grade inflation)",
    bullets: [
      "1–2 (Beginning): present but passive or disruptive.",
      "3–4 (Developing): follows the flow but does not influence it.",
      "5–6 (Proficient): standard excellence—active, researched, diplomatic.",
      "7–8 (Exemplary): reserved for game-changers—deadlocks solved or expert-level technical insights.",
    ],
  },
  {
    title: "Evidence requirement",
    bullets: [
      "Keep a session log—Statements of Confirmation cannot be written from memory.",
      "Prefer specifics over generics (e.g. compromise brokered on Clause 4 of Resolution 1.1).",
    ],
  },
  {
    title: "Managing the evaluation loop",
    bullets: [
      "Impartiality: scores must not reflect school or prior reputation.",
      "Delegates grade chairs mid-conference—professionalism and empathy matter.",
      "Where applicable, chairs may compare LLM-assisted scoring of position papers against human judgement to reduce implicit bias; include AI score and evidence when submitting Best Position Paper.",
    ],
  },
];

/** Live chair performance (max 64). PDF uses “Understanding” in score line; rubric row is Empathy. */
export const CHAIR_PERFORMANCE_RUBRIC: RubricCriterion[] = [
  {
    key: "pre_conference_support",
    label: "Pre-Conference Support",
    bandDescriptions: [
      "Study guide was late or incomplete; minimal communication with SMT/USGs.",
      "The study guide met basic requirements but lacked deep analysis or clear formatting.",
      "Comprehensive study guide; proactive in answering delegate emails and prep.",
      "Exceptional study guide; provided extra resources and early feedback on position papers.",
    ],
  },
  {
    key: "empathy",
    label: "Empathy",
    bandDescriptions: [
      "Dismissive of delegate anxieties; fails to notice when a delegate is struggling or excluded.",
      "Professional but clinical; provides support only when explicitly asked by a delegate.",
      "Actively checks in on quiet delegates; creates a safe space for beginners to participate.",
      "High emotional intelligence; anticipates delegate stress, manages heated conflicts with care, and ensures every voice feels valued.",
    ],
  },
  {
    key: "collaboration_co_chair",
    label: "Collaboration with Co-Chair",
    bandDescriptions: [
      "One chair dominates; lack of communication results in inconsistent rulings.",
      "Work is split but chairs operate in silos; minimal consultation on award decisions.",
      "Balanced partnership; clear communication and mutual support during sessions.",
      "Seamless synergy; chairs anticipate each other's needs and provide a unified, professional front.",
    ],
  },
  {
    key: "mun_knowledge",
    label: "MUN Knowledge",
    bandDescriptions: [
      "Frequent errors in Rules of Procedure (RoP); relies heavily on the Secretariat for help.",
      "Basic RoP knowledge; can run a standard moderated caucus but misses nuances of motions.",
      "Strong command of RoP; manages the floor efficiently and fairly with minimal errors.",
      "Absolute mastery; uses RoP to enhance debate flow and handles complex procedural situations with ease.",
    ],
  },
  {
    key: "country_stances_topic",
    label: "Country Stances & Topic Knowledge",
    bandDescriptions: [
      'Unable to identify if a delegate is speaking "out of character"; ignores policy accuracy.',
      "Generally aware of major power stances but misses shifts in smaller delegation policies.",
      "Actively monitors policy accuracy; guides delegates back to character when necessary.",
      "Deeply researched in all allocations; provides precise feedback on geopolitical nuances during debate.",
    ],
  },
  {
    key: "flexibility",
    label: "Flexibility",
    bandDescriptions: [
      "Rigid adherence to the schedule even when debate is stagnant; resistant to SMT feedback.",
      "Adapts only when prompted by the Secretariat; struggles with sudden changes in bloc dynamics.",
      "Responds well to committee shifts; adjusts speaking times or motions to benefit the debate flow.",
      "Highly adaptive; pivots seamlessly during crises or unexpected debate turns while maintaining order.",
    ],
  },
  {
    key: "professionalism",
    label: "Professionalism",
    bandDescriptions: [
      "Unprofessional attire or tone shows clear bias toward specific delegates or schools.",
      "Professional but lacks authority; occasional lapses in diplomatic decorum.",
      "Consistently professional; maintains impartiality and commands respect from the house.",
      "Exemplifies the Secretariat standard; flawless decorum, impartial, and serves as a role model.",
    ],
  },
  {
    key: "engagement",
    label: "Engagement",
    bandDescriptions: [
      "Appears bored or distracted; minimal feedback given to delegates during caucusing.",
      "Attentive but passive; does not actively encourage quieter delegates to participate.",
      "High energy; provides constructive feedback and keeps the committee motivated throughout.",
      "Inspiring presence; actively mentors delegates, fosters an inclusive environment, and drives high-level debate.",
    ],
  },
];

export const CHAIR_REPORT_OVERALL_RUBRIC: RubricCriterion[] = [
  {
    key: "academic_depth",
    label: "Academic Depth",
    bandDescriptions: [
      "Surface-level summary; lacks historical context or data.",
      "Good overview but misses complex legal or technical nuances.",
      "Strong analysis; includes specific past actions and regional data.",
      "Expert-level scholarship; identifies unique angles for debate.",
    ],
  },
  {
    key: "mandate_clarity",
    label: "Mandate Clarity",
    bandDescriptions: [
      'Vague "Questions to Consider"; unclear committee powers.',
      "Standard questions; general guidance on the scope of the debate.",
      "Clear, focused questions that guide delegates toward specific solutions.",
      "Precision-engineered prompts that prevent stagnant or off-topic debate.",
    ],
  },
  {
    key: "accessibility",
    label: "Accessibility",
    bandDescriptions: [
      "Overly dense or disorganized; difficult for beginners to navigate.",
      "Clean layout but lacks visual aids or a glossary of terms.",
      "Well-structured; includes helpful links, maps, and a clear glossary.",
      "Masterfully designed; balances high-level academia with intuitive navigation.",
    ],
  },
  {
    key: "resource_quality",
    label: "Resource Quality",
    bandDescriptions: [
      "Few or outdated links provided for delegate research.",
      "Standard UN links provided; covers the basics for most nations.",
      "Diverse and curated bibliography including NGOs, treaties, and data sets.",
      'Comprehensive toolkit; provides delegates with "hidden" data and niche sources.',
    ],
  },
];

export const CHAIR_REPORT_SECTION_RUBRIC: RubricCriterion[] = [
  {
    key: "committee_introduction",
    label: "Committee Introduction",
    bandDescriptions: [
      "Provides only a generic definition of the committee's name.",
      "Lists the mandate but fails to explain the committee's specific powers or limitations.",
      "Clearly outlines the committee's history, scope of authority, and role within the UN system.",
      'Masterfully connects the committee\'s specific legal "teeth" to the current agenda items.',
    ],
  },
  {
    key: "topic_introduction",
    label: "Topic Introduction",
    bandDescriptions: [
      "Vague or overly broad; fails to define the core problem.",
      "Provides a general summary but lacks current data or recent developments.",
      "Comprehensive overview; defines technical terms and the current global status of the issue.",
      'A compelling narrative that identifies specific "blind spots" in international policy.',
    ],
  },
  {
    key: "timeline",
    label: "Timeline",
    bandDescriptions: [
      "Missing major historical milestones or treaties.",
      "Lists basic dates but fails to explain the significance of past actions.",
      "Accurate chronological flow; explains how past resolutions led to the current situation.",
      "Strategic timeline that highlights failed vs successful interventions to guide future debate.",
    ],
  },
  {
    key: "key_stances",
    label: "Key Stances",
    bandDescriptions: [
      "Only mentions P5 nations; ignores regional blocs or minor stakeholders.",
      'Groups countries broadly (e.g. "The West") without nuanced policy differences.',
      "Details the specific priorities of major interest groups and key regional players.",
      'Sophisticated analysis of clashing "red lines" and potential spoilers in the negotiation process.',
    ],
  },
  {
    key: "possible_solutions",
    label: "Possible Solutions",
    bandDescriptions: [
      'Generic or repetitive (e.g. "more funding," "awareness").',
      "Suggests logical steps but lacks details on implementation or oversight.",
      "Proposes innovative, multi-dimensional frameworks aligned with the committee's mandate.",
      'High-level "Purposeful Policy" solutions that address root causes and technical feasibility.',
    ],
  },
];

export const BEST_COMMITTEE_RUBRIC: RubricCriterion[] = [
  {
    key: "debate_productivity",
    label: "Debate Productivity",
    bandDescriptions: [
      "Frequent lulls in debate; circular arguments with no progress.",
      'Steady debate but struggles to move beyond "Topic A" generalities.',
      "High-level discourse; delegates move quickly into substantive solutions.",
      "Dynamic and evolving debate; the house stays engaged and intellectually sharp.",
    ],
  },
  {
    key: "collaborative_spirit",
    label: "Collaborative Spirit",
    bandDescriptions: [
      "Highly toxic or cliquey; minor blocs refuse to speak to one another.",
      "Standard diplomatic behavior; basic cooperation during caucusing.",
      "Inclusive atmosphere; larger blocs actively seek input from minor nations.",
      'Exemplary diplomacy; high "purposeful policy" alignment and consensus-building.',
    ],
  },
  {
    key: "resolution_quality",
    label: "Resolution Quality",
    bandDescriptions: [
      'Shallow resolutions; "vague encouragement" rather than action.',
      "Standard clauses; addresses the symptoms but not the root causes.",
      "Technically sound resolutions with clear funding and oversight mechanisms.",
      "Sophisticated, innovative, and actionable documents that reflect real UN standards.",
    ],
  },
  {
    key: "chair_delegate_synergy",
    label: "Chair–Delegate Synergy",
    bandDescriptions: [
      "Chairs struggle to manage the room; low respect for the dais.",
      "Functional relationship; chairs follow the schedule but don't lead.",
      "Positive energy; chairs mentor delegates while maintaining firm order.",
      "Seamless synergy; the dais inspires a professional and high-stakes environment.",
    ],
  },
];
