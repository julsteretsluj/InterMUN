// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Role-scoped product how-to sections for Guides.
 * i18n copy lives under `guides.roles.{role}.{sectionKey}.{title|body|entries}`.
 * Hash / deep-link ids are `{role}-{sectionKey}` (e.g. `chair-session`).
 */

export type GuideRole = "delegate" | "chair" | "smt" | "advisor" | "admin";

export const GUIDE_ROLES: readonly GuideRole[] = [
  "delegate",
  "chair",
  "smt",
  "advisor",
  "admin",
] as const;

/** Ordered section keys per role (product curriculum layer). */
export const GUIDES_CURRICULUM: Record<GuideRole, readonly string[]> = {
  delegate: ["overview", "prep", "floor", "documents", "tools", "glossary"],
  chair: ["overview", "session", "prep", "tools", "glossary"],
  smt: ["overview", "operations", "people", "tools", "conference"],
  advisor: ["overview", "delegation", "tools"],
  admin: ["overview", "setup", "tools"],
};

export function isGlossaryGuideSection(role: GuideRole, sectionKey: string): boolean {
  return sectionKey === "glossary" && (role === "delegate" || role === "chair");
}

export function isSmtConferenceGuidesSection(role: GuideRole, sectionKey?: string): boolean {
  return role === "smt" && sectionKey === "conference";
}

export function curriculumSectionId(role: GuideRole, sectionKey: string): string {
  return `${role}-${sectionKey}`;
}

export function parseCurriculumHash(
  hash: string
): { role: GuideRole; sectionKey: string } | null {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) return null;
  for (const role of GUIDE_ROLES) {
    const prefix = `${role}-`;
    if (raw.startsWith(prefix)) {
      const sectionKey = raw.slice(prefix.length);
      if (sectionKey && (GUIDES_CURRICULUM[role] as readonly string[]).includes(sectionKey)) {
        return { role, sectionKey };
      }
    }
  }
  return null;
}

export function isGuideRole(value: string | null | undefined): value is GuideRole {
  return (
    value === "delegate" ||
    value === "chair" ||
    value === "smt" ||
    value === "advisor" ||
    value === "admin"
  );
}

export function guidesBasePathForRole(role: GuideRole): string {
  switch (role) {
    case "smt":
      return "/smt/guides";
    case "advisor":
      return "/advisor/guides";
    case "admin":
      return "/admin/guides";
    default:
      return "/guides";
  }
}
