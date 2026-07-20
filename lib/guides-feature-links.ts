// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import {
  curriculumSectionId,
  guidesBasePathForRole,
  type GuideRole,
} from "@/lib/guides-curriculum";

export type GuideFeatureId =
  | "session"
  | "resolutions"
  | "documents"
  | "speeches"
  | "stances"
  | "voting"
  | "notes"
  | "awards"
  | "allocationMatrix"
  | "allocationPasswords"
  | "newsroom"
  | "runningNotes"
  | "sources"
  | "milestones"
  | "amendments"
  | "pressCorps";

type FeatureGuideTarget = {
  /** Curriculum section key under the preferred role (without role prefix). */
  sectionKey: string;
  /** Preferred role for this feature’s how-to. */
  preferredRole: GuideRole;
};

/**
 * Maps product features → curriculum section keys.
 * Callers resolve the final href with {@link resolveFeatureGuideHref} using the viewer’s role.
 */
export const GUIDE_FEATURE_TARGETS: Record<GuideFeatureId, FeatureGuideTarget> = {
  session: { preferredRole: "chair", sectionKey: "session" },
  resolutions: { preferredRole: "delegate", sectionKey: "documents" },
  documents: { preferredRole: "delegate", sectionKey: "documents" },
  speeches: { preferredRole: "delegate", sectionKey: "prep" },
  stances: { preferredRole: "delegate", sectionKey: "prep" },
  voting: { preferredRole: "delegate", sectionKey: "floor" },
  notes: { preferredRole: "delegate", sectionKey: "tools" },
  awards: { preferredRole: "chair", sectionKey: "tools" },
  allocationMatrix: { preferredRole: "smt", sectionKey: "people" },
  allocationPasswords: { preferredRole: "smt", sectionKey: "operations" },
  newsroom: { preferredRole: "delegate", sectionKey: "tools" },
  runningNotes: { preferredRole: "delegate", sectionKey: "tools" },
  sources: { preferredRole: "delegate", sectionKey: "prep" },
  milestones: { preferredRole: "delegate", sectionKey: "tools" },
  amendments: { preferredRole: "delegate", sectionKey: "documents" },
  pressCorps: { preferredRole: "delegate", sectionKey: "tools" },
};

/**
 * Prefer the viewer’s own guides page when that role has a matching section;
 * otherwise fall back to the feature’s preferred role curriculum (still on the viewer’s base path
 * when possible, or the preferred role’s path for cross-role deep links on shared surfaces).
 */
export function resolveFeatureGuideHref(
  featureId: GuideFeatureId,
  viewerRole: GuideRole
): { href: string; sectionId: string } {
  const target = GUIDE_FEATURE_TARGETS[featureId];
  const sectionKey = target.sectionKey;
  // Always open the viewer’s guides route; hash points at the preferred curriculum section id
  // so GuidesView can switch role layer when the section belongs to another role.
  const sectionId = curriculumSectionId(target.preferredRole, sectionKey);
  const href = `${guidesBasePathForRole(viewerRole)}#${sectionId}`;
  return { href, sectionId };
}
