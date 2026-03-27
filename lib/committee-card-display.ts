/** Known chamber labels → full name when `committee_full_name` is not set in DB. */
const WELL_KNOWN_COMMITTEE_FULL_NAME: Record<string, string> = {
  DISEC: "Disarmament and International Security Committee",
  ECOSOC: "Economic and Social Council",
  WHO: "World Health Organization",
  UNSC: "United Nations Security Council",
  UNHRC: "United Nations Human Rights Council",
  UNODC: "United Nations Office on Drugs and Crime",
  "UN WOMEN": "UN Women",
  UNWOMEN: "UN Women",
  INTERPOL: "INTERPOL",
  "PRESS CORPS": "Press Corps",
  PRESSCORPS: "Press Corps",
};

export type CommitteeDisplayTags = {
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  ageRange: string;
  format: "Traditional" | "Crisis";
  eslFriendly: boolean;
};

const WELL_KNOWN_COMMITTEE_TAGS: Record<string, CommitteeDisplayTags> = {
  ECOSOC: {
    difficulty: "Beginner",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  F1: {
    difficulty: "Beginner",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  "PRESS CORPS": {
    difficulty: "Beginner",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  UNICEF: {
    difficulty: "Beginner",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: true,
  },
  EU: {
    difficulty: "Intermediate",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  "EU PARLI": {
    difficulty: "Intermediate",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  UNESCO: {
    difficulty: "Intermediate",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  UNHRC: {
    difficulty: "Intermediate",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: true,
  },
  UNODC: {
    difficulty: "Intermediate",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: false,
  },
  UNSC: {
    difficulty: "Intermediate",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Crisis",
    eslFriendly: false,
  },
  "UN WOMEN": {
    difficulty: "Intermediate",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: false,
  },
  UNWOMEN: {
    difficulty: "Intermediate",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: false,
  },
  DISEC: {
    difficulty: "Advanced",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Traditional",
    eslFriendly: false,
  },
  FWC: {
    difficulty: "Advanced",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Crisis",
    eslFriendly: false,
  },
  HSC: {
    difficulty: "Advanced",
    ageRange: "Grade 7-12 · Year 8-13",
    format: "Crisis",
    eslFriendly: false,
  },
  INTERPOL: {
    difficulty: "Advanced",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: false,
  },
  WHO: {
    difficulty: "Advanced",
    ageRange: "Grade 9-12 · Year 10-13",
    format: "Traditional",
    eslFriendly: false,
  },
};

function acronymLookupKey(committee: string): string[] {
  const t = committee.trim();
  if (!t) return [];
  const upper = t.toUpperCase();
  const firstToken = t.split(/\s*-\s*/)[0]?.trim().toUpperCase() ?? upper;
  const noParen = upper.replace(/\([^)]*\)/g, "").trim();
  return [upper, firstToken, noParen];
}

export function resolveCommitteeFullName(
  committeeFullName: string | null | undefined,
  committee: string | null | undefined
): string | null {
  const fromDb = committeeFullName?.trim();
  if (fromDb) return fromDb;

  const c = committee?.trim();
  if (!c) return null;

  for (const key of acronymLookupKey(c)) {
    const hit = WELL_KNOWN_COMMITTEE_FULL_NAME[key];
    if (hit) return hit;
  }
  return null;
}

/** Line for SMT grid: "Full name — Acronym/label", without session topic (`name`). */
export function formatCommitteeCardTitle(
  committeeFullName: string | null | undefined,
  committee: string | null | undefined
): string {
  const full = resolveCommitteeFullName(committeeFullName, committee);
  const ac = committee?.trim() || "";
  if (full && ac) return `${full} — ${ac}`;
  if (ac) return ac;
  return "Committee";
}

export function resolveCommitteeDisplayTags(
  committee: string | null | undefined
): CommitteeDisplayTags | null {
  const c = committee?.trim();
  if (!c) return null;
  for (const key of acronymLookupKey(c)) {
    const hit = WELL_KNOWN_COMMITTEE_TAGS[key];
    if (hit) return hit;
  }
  return null;
}

