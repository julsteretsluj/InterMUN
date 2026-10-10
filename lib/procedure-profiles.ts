// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export type ProcedureProfile = "default" | "eu_parliament" | "press_corps" | "fwc_crisis";

export function normalizeProcedureProfile(value: string | null | undefined): ProcedureProfile {
  const v = value?.toString().trim().toLowerCase();
  if (v === "eu_parliament") return "eu_parliament";
  if (v === "press_corps") return "press_corps";
  if (v === "fwc_crisis") return "fwc_crisis";
  return "default";
}

export function isEuParliamentProcedure(value: string | null | undefined): boolean {
  return normalizeProcedureProfile(value) === "eu_parliament";
}

export function isPressCorpsProcedure(value: string | null | undefined): boolean {
  return normalizeProcedureProfile(value) === "press_corps";
}

export function isFwcCrisisProcedure(value: string | null | undefined): boolean {
  return normalizeProcedureProfile(value) === "fwc_crisis";
}

/** Heuristic when procedure_profile is unset / legacy rows. */
export function looksLikePressCorpsCommittee(committee: string | null | undefined): boolean {
  const label = committee?.toString().trim().toLowerCase() ?? "";
  return label.includes("press") && (label.includes("corp") || label.includes("corps"));
}

/** FWC chamber label (e.g. "FWC - Stranger Things"); mirrors `isFwcCommittee`. */
export function looksLikeFwcCommittee(committee: string | null | undefined): boolean {
  const raw = (committee ?? "").trim();
  if (!raw) return false;
  return /\bFWC\b/.test(raw.toUpperCase().replace(/\s+/g, " "));
}

/**
 * Stored profile with committee-label fallback, so FWC keeps its RoP even if a settings
 * form re-saves the row as `default`.
 */
export function resolveProcedureProfile(
  stored: string | null | undefined,
  committee: string | null | undefined
): ProcedureProfile {
  const profile = normalizeProcedureProfile(stored);
  if (profile !== "default") return profile;
  if (looksLikeFwcCommittee(committee)) return "fwc_crisis";
  if (looksLikePressCorpsCommittee(committee)) return "press_corps";
  return profile;
}
