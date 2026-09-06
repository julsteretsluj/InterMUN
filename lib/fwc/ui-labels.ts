// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type {
  FwcApprovalStatus,
  FwcDirectiveType,
  FwcMeterKey,
  FwcOverallVerdict,
  FwcPostMovementAction,
} from "@/lib/fwc/types";

export const FWC_DIRECTIVE_TYPE_LABELS: Record<FwcDirectiveType, string> = {
  personal: "Personal",
  joint: "Joint",
  cabinet: "Cabinet",
  press_release: "Press release",
  rapid_crisis_action: "Rapid crisis action",
};

export const FWC_APPROVAL_STATUS_LABELS: Record<FwcApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  approved_with_conditions: "Approved with conditions",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

export const FWC_VERDICT_LABELS: Record<FwcOverallVerdict, string> = {
  APPROVED: "Approved",
  APPROVED_WITH_CONDITIONS: "Approved with conditions",
  REJECTED: "Rejected",
  NEEDS_REVISION: "Needs revision",
};

export const FWC_POST_MOVEMENT_ACTION_LABELS: Record<FwcPostMovementAction, string> = {
  search_for_evidence: "Search for evidence",
  send_directive: "Send a directive",
  none: "None",
};

export const FWC_METER_LABELS: Record<FwcMeterKey, string> = {
  public_panic_exposure: "Public panic / exposure",
  dimensional_breach_index: "Dimensional breach index",
  hive_strain_spore_density: "Hive strain / spore density",
  covert_secrecy_index: "Covert secrecy index",
  subterranean_footprint: "Subterranean footprint",
  subject_control_rating: "Subject control rating",
};

export const FWC_METER_RANGES: Record<FwcMeterKey, { min: number; max: number }> = {
  public_panic_exposure: { min: 0, max: 100 },
  dimensional_breach_index: { min: 1, max: 5 },
  hive_strain_spore_density: { min: 0, max: 100 },
  covert_secrecy_index: { min: 0, max: 100 },
  subterranean_footprint: { min: 0, max: 100 },
  subject_control_rating: { min: 0, max: 100 },
};

export const FWC_CRITERION_LABELS = {
  realism: "Realism & 1980s tech",
  spatial: "Spatial & movement",
  portfolio: "Portfolio & assets",
  narrative: "Narrative & evidence",
  balance: "Committee flow & balance",
} as const;
