// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Per-committee Rules of Procedure config. Everything a chair or delegate surface needs
 * to run a committee by its RoP lives in one of these objects, so a RoP revision is a
 * config edit. Keep this file free of runtime imports: `tests/rop/*.test.mjs` load the
 * engine with Node's type stripping.
 */

export type RopMajority = "simple" | "2/3";

/**
 * - `more_than_fraction`: yes > fraction × base (classic "more than half").
 * - `fraction_plus_one`: yes ≥ ceil(fraction × base + 1) — the literal
 *   "50% of present + 1 vote" reading.
 */
export type RopMajorityFormula = "more_than_fraction" | "fraction_plus_one";

/** Who counts toward the threshold base. */
export type RopVoteDenominator = "present" | "all_members" | "votes_cast";

export type RopMotionPhase = "debate" | "voting" | "any";

export type RopMotionField = "totalMinutes" | "speakerSeconds" | "topic" | "target" | "agendaTopic";

export type RopMotionDef = {
  code: string;
  /** i18n key under `rop.motions`. */
  labelKey: string;
  /** English fallback (config readers outside next-intl). */
  label: string;
  majority: RopMajority;
  denominator?: RopVoteDenominator;
  /** Higher = more disruptive = voted first. */
  precedence: number;
  phase: RopMotionPhase;
  requiredFields: readonly RopMotionField[];
  /** Raised from the floor by delegates (false = chair-only / system motions). */
  delegateRaisable: boolean;
  /** Free-text constraint shown to chairs (e.g. "last session only"). */
  noteKey?: string;
};

export type RopPointDef = {
  code: string;
  labelKey: string;
  label: string;
  /** May interrupt a speaker. */
  interrupts: boolean;
  /** Raised by note to the dais rather than aloud. */
  viaNote: boolean;
  /** Needs chair discretion (e.g. right of reply). */
  chairDiscretion: boolean;
};

export type RopYieldDef = {
  code: "chair" | "questions" | "delegate";
  labelKey: string;
  label: string;
  /** Delegate who received a yield cannot yield again. */
  noReyield?: boolean;
};

export type RopMotionRules = {
  /** "Motions must be voted on; no member may abstain". */
  motionsAllowAbstain: boolean;
  /** "One motion per round is permitted per delegate". */
  maxMotionsPerDelegatePerRound: number;
  /** "If 2 or more delegates second a motion and there are no objections → passes". */
  autoPassMinSeconds: number | null;
};

export type RopVotingRules = {
  formula: RopMajorityFormula;
  simpleFraction: number;
  twoThirdsFraction: number;
  /** "Present and voting" delegates cannot abstain on substantive votes. */
  presentVotingMayAbstainSubstantive: boolean;
};

export type RopSpeakingRules = {
  gslSeconds: number;
  yields: readonly RopYieldDef[];
};

/* ---------------- Directives ---------------- */

export type RopDirectiveField =
  | "title"
  | "request"
  | "characterPower"
  | "assets"
  | "resource"
  | "reason"
  | "targetGrid";

export type RopDirectiveVisibility = "authors" | "committee";

export type RopDirectiveTypeDef = {
  key: string;
  labelKey: string;
  label: string;
  /** Short RoP description shown in the composer. */
  summary: string;
  /** Total authors including the lead submitter. */
  minAuthors: number;
  maxAuthors: number | null;
  /** Co-authors must sign before the directive reaches the dais. */
  coAuthorsMustSign: boolean;
  /** Label for co-authors in UI ("co-signers", "sponsors"). */
  coAuthorNoun: "co-signers" | "sponsors" | "co-authors";
  /**
   * Authors pool their characters' powers and assets ("combining Eleven's telekinesis with
   * Kali's illusions"). false: only the lead submitter's character may be cited.
   */
  pooledResources: boolean;
  /**
   * Which power "Type" tags this directive may cite. The RoP's sample joint/cabinet directives
   * combine powers tagged "Personal Directive", so pooled types accept "any".
   */
  acceptsPowerTypes: readonly string[] | "any";
  requiredFields: readonly RopDirectiveField[];
  maxRequestChars: number;
  anonymityAllowed: boolean;
  /** Who can read the full directive once submitted (staff always can). */
  visibility: RopDirectiveVisibility;
  /** Floor vote needed to pass (dais cannot approve directly). */
  floorVote: { majority: RopMajority; denominator: RopVoteDenominator } | null;
  /** Approved outcome is posted to the committee crisis feed. */
  publishOutcomeToFeed: boolean;
  /** Queue priority (lower first). */
  queuePriority: number;
  /**
   * When the type may be submitted.
   * - `any`: whenever the committee is in session.
   * - `active_crisis`: only while a crisis update is open (rapid reactions).
   */
  submitWindow: "any" | "active_crisis";
  /** Drafting guidance (not enforced), e.g. "during unmoderated caucuses". */
  draftingHintKey?: string;
};

export type RopDirectiveStatus =
  | "draft"
  | "awaiting_signatures"
  | "pending"
  | "on_floor"
  | "approved"
  | "approved_with_conditions"
  | "rejected"
  | "needs_revision"
  | "withdrawn";

export type RopDirectiveRules = {
  types: readonly RopDirectiveTypeDef[];
  /** Anonymity uses per character per crisis session. */
  anonymityUsesPerSession: number;
  /** "Final cabinet directive": one per cabinet per crisis day. */
  finalDirective: { typeKey: string; perCabinetPerDay: number } | null;
  /** Character status keys that block writing/submitting directives. */
  blockingStatusKeys: readonly string[];
};

/* ---------------- Crisis mechanics ---------------- */

export type RopFrequencyScope = "day" | "session" | "simulation" | "mod_caucus_window" | "unlimited";

export type RopFrequencyDef = {
  key: string;
  label: string;
  scope: RopFrequencyScope;
  max: number;
  /** For `mod_caucus_window`: one use per this many moderated caucuses. */
  window?: number;
};

export type RopPowerDef = {
  key: string;
  label: string;
  /** One-line RoP mechanism shown next to the option. */
  summary?: string;
  directiveTypes: readonly string[];
  frequency: string;
  /** Needs another character's or the head chair's sign-off. */
  approvalNote?: string;
};

export type RopMeterDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  /** Stored in a legacy `fwc_meters` column instead of the per-character JSON. */
  legacyColumn?: string;
};

export type RopAssetCategory = "property" | "supplies" | "allies";

/** A character-sheet asset ("Property & Facilities", "Supplies & Logistics", "Allies & Operatives"). */
export type RopAssetDef = {
  key: string;
  label: string;
  category: RopAssetCategory;
};

export type RopCharacterDef = {
  /** Allocation `country` label in the matrix. */
  country: string;
  cabinet: string;
  powers: readonly RopPowerDef[];
  assets: readonly RopAssetDef[];
  meters: readonly RopMeterDef[];
};

export type RopCabinetDef = { key: string; label: string };

export type RopStatusDef = {
  key: string;
  label: string;
  effect: string;
  blocksDirectives: boolean;
  blocksMovement: boolean;
};

export type RopInventoryItemDef = {
  code: string;
  cabinet: string;
  category: string;
  name: string;
  location: string;
  status: string;
};

export type RopClockConfig = {
  label: string;
  /** In-game minutes after midnight at the anchor (720 = 12:00). */
  startMinutes: number;
  /** In-game seconds per real second (2 real h = 12 in-game h → 6). */
  rate: number;
  /** false: every committee session restarts at `startMinutes`. */
  carryOverBetweenSessions: boolean;
  /** In-game time-of-day blocks used by the backroom ("Morning/Afternoon/Evening"). */
  blocks: readonly { key: string; label: string; fromMinutes: number }[];
};

export type RopCrisisConfig = {
  /** Delegates may question the chairs for this long after a crisis update. */
  qaSeconds: number;
  /** How the committee picks a pathway. */
  pathwayDecision: "plurality";
  movement: {
    oneRequestAtATime: boolean;
    editableWhileQueued: boolean;
    /** Vehicle bonus only applies to road/pavement tiles. */
    vehicleBonusTerrain: readonly string[];
  };
  cabinets: readonly RopCabinetDef[];
  characters: readonly RopCharacterDef[];
  frequencies: readonly RopFrequencyDef[];
  statuses: readonly RopStatusDef[];
  globalMeters: readonly RopMeterDef[];
  inventory: readonly RopInventoryItemDef[];
  clock: RopClockConfig;
};

export type CommitteeRopConfig = {
  id: string;
  title: string;
  /** Version label so chairs can tell which RoP draft is live. */
  version: string;
  motions: readonly RopMotionDef[];
  points: readonly RopPointDef[];
  motionRules: RopMotionRules;
  voting: RopVotingRules;
  speaking: RopSpeakingRules;
  directives: RopDirectiveRules | null;
  crisis: RopCrisisConfig | null;
};
