// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type {
  CommitteeRopConfig,
  RopMajority,
  RopMotionDef,
  RopMotionField,
  RopVoteDenominator,
  RopVotingRules,
} from "./types";

export function findRopMotion(config: CommitteeRopConfig, code: string | null | undefined): RopMotionDef | null {
  if (!code) return null;
  return config.motions.find((m) => m.code === code) ?? null;
}

/** Minimum YES votes needed for `majority` over `base` members. */
export function requiredYesVotes(voting: RopVotingRules, majority: RopMajority, base: number): number {
  if (base <= 0) return Infinity;
  const fraction = majority === "2/3" ? voting.twoThirdsFraction : voting.simpleFraction;
  const raw = fraction * base;
  if (voting.formula === "fraction_plus_one") {
    return Math.ceil(raw + 1 - 1e-9);
  }
  // more_than_fraction: smallest integer strictly greater than raw.
  return Math.floor(raw + 1e-9) + 1;
}

export type RopTally = {
  yes: number;
  no: number;
  abstain?: number;
  /** Members marked present on roll. */
  present: number;
  /** All voting members of the committee (seated delegates). */
  members: number;
};

export function denominatorFor(denominator: RopVoteDenominator, tally: RopTally): number {
  if (denominator === "all_members") return tally.members;
  if (denominator === "votes_cast") return tally.yes + tally.no;
  return tally.present;
}

export function didRopVotePass(
  config: CommitteeRopConfig,
  input: { majority: RopMajority; denominator?: RopVoteDenominator; tally: RopTally }
): boolean {
  const base = denominatorFor(input.denominator ?? "present", input.tally);
  return input.tally.yes >= requiredYesVotes(config.voting, input.majority, base);
}

/** Vote outcome for a stated motion, using the motion's configured threshold and base. */
export function didRopMotionPass(
  config: CommitteeRopConfig,
  procedureCode: string | null,
  storedMajority: string,
  tally: RopTally
): boolean {
  const def = findRopMotion(config, procedureCode);
  const majority: RopMajority = def?.majority ?? (storedMajority === "2/3" ? "2/3" : "simple");
  return didRopVotePass(config, { majority, denominator: def?.denominator ?? "present", tally });
}

export function ropMotionMajority(config: CommitteeRopConfig, code: string | null): RopMajority {
  return findRopMotion(config, code)?.majority ?? "simple";
}

export function ropMotionPrecedence(config: CommitteeRopConfig, code: string | null): number {
  return findRopMotion(config, code)?.precedence ?? 40;
}

/** Most disruptive first; equal precedence keeps the order raised. */
export function sortByRopPrecedence<T extends { procedure_code: string | null; created_at: string }>(
  config: CommitteeRopConfig,
  rows: readonly T[]
): T[] {
  return [...rows].sort((a, b) => {
    const d = ropMotionPrecedence(config, b.procedure_code) - ropMotionPrecedence(config, a.procedure_code);
    if (d !== 0) return d;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export type RopMotionDetail = {
  totalMinutes?: number | null;
  speakerSeconds?: number | null;
  topic?: string | null;
  target?: string | null;
  agendaTopic?: string | null;
};

/** Returns the missing required field keys for a raised motion. */
export function missingMotionFields(def: RopMotionDef, detail: RopMotionDetail): RopMotionField[] {
  const missing: RopMotionField[] = [];
  for (const field of def.requiredFields) {
    const v = detail[field];
    if (field === "totalMinutes" || field === "speakerSeconds") {
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) missing.push(field);
    } else if (typeof v !== "string" || !v.trim()) {
      missing.push(field);
    }
  }
  return missing;
}

export function motionAllowedInPhase(def: RopMotionDef, phase: "debate" | "voting"): boolean {
  return def.phase === "any" || def.phase === phase;
}

/** One-motion-per-round rule. `raisedThisRound` = motions this delegate already raised this round. */
export function canDelegateRaiseMotion(config: CommitteeRopConfig, raisedThisRound: number): boolean {
  return raisedThisRound < config.motionRules.maxMotionsPerDelegatePerRound;
}

/** "2+ seconds and no objections → passes automatically". */
export function motionPassesUnopposed(config: CommitteeRopConfig, seconds: number, objections: number): boolean {
  const min = config.motionRules.autoPassMinSeconds;
  return min != null && seconds >= min && objections === 0;
}
