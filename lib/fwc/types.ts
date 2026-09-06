// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const FWC_DIRECTIVE_TYPES = [
  "personal",
  "joint",
  "cabinet",
  "press_release",
  "rapid_crisis_action",
] as const;

export type FwcDirectiveType = (typeof FWC_DIRECTIVE_TYPES)[number];

/** Cabinet and Rapid Crisis Actions cannot be anonymized (RoP). */
export const FWC_ANONYMITY_FORBIDDEN_DIRECTIVE_TYPES: readonly FwcDirectiveType[] = [
  "cabinet",
  "rapid_crisis_action",
];

export const FWC_ANONYMITY_STATUSES = ["active", "inactive"] as const;
export type FwcAnonymityStatus = (typeof FWC_ANONYMITY_STATUSES)[number];

export const FWC_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "approved_with_conditions",
  "rejected",
  "needs_revision",
] as const;

export type FwcApprovalStatus = (typeof FWC_APPROVAL_STATUSES)[number];

export const FWC_OVERALL_VERDICTS = [
  "APPROVED",
  "APPROVED_WITH_CONDITIONS",
  "REJECTED",
  "NEEDS_REVISION",
] as const;

export type FwcOverallVerdict = (typeof FWC_OVERALL_VERDICTS)[number];

export const FWC_TERRAIN_TYPES = [
  "road_pavement",
  "building_interior",
  "forest_trees",
  "water_shallow",
  "corrupted_terrain",
  "spore_cloud",
  "void_deep_rift",
  "impassable",
] as const;

export type FwcTerrainType = (typeof FWC_TERRAIN_TYPES)[number];

export const FWC_POST_MOVEMENT_ACTIONS = [
  "search_for_evidence",
  "send_directive",
  "none",
] as const;

export type FwcPostMovementAction = (typeof FWC_POST_MOVEMENT_ACTIONS)[number];

export const FWC_MOVEMENT_STATUSES = ["queued", "approved", "rejected"] as const;
export type FwcMovementStatus = (typeof FWC_MOVEMENT_STATUSES)[number];

export const FWC_EVALUATION_CRITERIA = [
  "realism",
  "spatial",
  "portfolio",
  "narrative",
  "balance",
] as const;

export type FwcEvaluationCriterion = (typeof FWC_EVALUATION_CRITERIA)[number];

export type FwcCriterionScores = {
  realism: number;
  spatial: number;
  portfolio: number;
  narrative: number;
  balance: number;
};

export type FwcRecommendedResolution = {
  in_game_time_of_resolution: string;
  evidence_output: string;
  map_and_meter_impact: string;
};

export type FwcEvaluationPayload = {
  overall_verdict: FwcOverallVerdict;
  viability_score: number;
  criterion_scores: FwcCriterionScores;
  strengths: string[];
  realism_and_logistical_flaws: string[];
  recommended_resolution: FwcRecommendedResolution;
  chair_revision_guidance: string;
};

export const FWC_METER_KEYS = [
  "public_panic_exposure",
  "dimensional_breach_index",
  "hive_strain_spore_density",
  "covert_secrecy_index",
  "subterranean_footprint",
  "subject_control_rating",
] as const;

export type FwcMeterKey = (typeof FWC_METER_KEYS)[number];

/** One row per canonical FWC conference. Ranges: most 0–100; dimensional_breach_index is 1–5. */
export type FwcMeters = {
  public_panic_exposure: number;
  dimensional_breach_index: number;
  hive_strain_spore_density: number;
  covert_secrecy_index: number;
  subterranean_footprint: number;
  subject_control_rating: number;
};

export type FwcMovementFields = {
  currentGrid: string;
  targetGrid: string;
  baseMp: number;
  bonusMp: number;
  terrainType: FwcTerrainType;
  postMovementAction: FwcPostMovementAction;
  status: FwcMovementStatus;
};

export type FwcCharacterCatalogEntry = {
  /** Allocation `country` label already in the matrix. */
  country: string;
  displayName: string;
  aliases: readonly string[];
  baseMp: number;
  baseGrid: string;
  /** Vehicle road bonus (0 if the starter pack has no paved-road MP bonus). */
  bonusMp: number;
  vehicleLabel: string | null;
  /** Short powers/assets blurb for the Backroom evaluation form. */
  powersAndAssets: string;
  /** Personal / joint / press may use anonymity once per session when true. */
  anonymityEligible: boolean;
};
