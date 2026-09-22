// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export type ProcedureProfile = "default" | "eu_parliament" | "press_corps";

export function normalizeProcedureProfile(value: string | null | undefined): ProcedureProfile {
  const v = value?.toString().trim().toLowerCase();
  if (v === "eu_parliament") return "eu_parliament";
  if (v === "press_corps") return "press_corps";
  return "default";
}

export function isEuParliamentProcedure(value: string | null | undefined): boolean {
  return normalizeProcedureProfile(value) === "eu_parliament";
}

export function isPressCorpsProcedure(value: string | null | undefined): boolean {
  return normalizeProcedureProfile(value) === "press_corps";
}

/** Heuristic when procedure_profile is unset / legacy rows. */
export function looksLikePressCorpsCommittee(committee: string | null | undefined): boolean {
  const label = committee?.toString().trim().toLowerCase() ?? "";
  return label.includes("press") && (label.includes("corp") || label.includes("corps"));
}
