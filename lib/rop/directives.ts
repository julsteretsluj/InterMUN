// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type {
  CommitteeRopConfig,
  RopDirectiveField,
  RopDirectiveStatus,
  RopDirectiveTypeDef,
} from "./types";

export const ROP_DIRECTIVE_STATUSES: readonly RopDirectiveStatus[] = [
  "draft",
  "awaiting_signatures",
  "pending",
  "on_floor",
  "approved",
  "approved_with_conditions",
  "rejected",
  "needs_revision",
  "withdrawn",
];

/** Statuses where the dais has given a final answer. */
export const ROP_DIRECTIVE_DECIDED: readonly RopDirectiveStatus[] = [
  "approved",
  "approved_with_conditions",
  "rejected",
];

/** Statuses the author can still edit. */
export const ROP_DIRECTIVE_EDITABLE: readonly RopDirectiveStatus[] = ["draft", "needs_revision"];

export function findDirectiveType(config: CommitteeRopConfig, key: string | null | undefined): RopDirectiveTypeDef | null {
  if (!key || !config.directives) return null;
  return config.directives.types.find((t) => t.key === key) ?? null;
}

export type DirectiveFields = Partial<Record<RopDirectiveField, string | null>>;

export type DirectiveValidationError =
  | { code: "unknown_type" }
  | { code: "missing_field"; field: RopDirectiveField }
  | { code: "too_long"; max: number }
  | { code: "too_few_authors"; min: number }
  | { code: "too_many_authors"; max: number }
  | { code: "anonymity_not_allowed" }
  | { code: "anonymity_used_up" };

/**
 * Validate a directive before it leaves draft. `authorCount` includes the lead submitter.
 * Drafts themselves only need a type and a title.
 */
export function validateDirectiveForSubmit(
  config: CommitteeRopConfig,
  input: {
    typeKey: string;
    fields: DirectiveFields;
    authorCount: number;
    anonymity: boolean;
    anonymityUsesThisSession: number;
  }
): DirectiveValidationError[] {
  const type = findDirectiveType(config, input.typeKey);
  if (!type) return [{ code: "unknown_type" }];
  const errors: DirectiveValidationError[] = [];
  for (const field of type.requiredFields) {
    const v = input.fields[field];
    if (typeof v !== "string" || !v.trim()) errors.push({ code: "missing_field", field });
  }
  const request = input.fields.request ?? "";
  if (request.length > type.maxRequestChars) errors.push({ code: "too_long", max: type.maxRequestChars });
  if (input.authorCount < type.minAuthors) errors.push({ code: "too_few_authors", min: type.minAuthors });
  if (type.maxAuthors != null && input.authorCount > type.maxAuthors) {
    errors.push({ code: "too_many_authors", max: type.maxAuthors });
  }
  if (input.anonymity) {
    if (!type.anonymityAllowed) errors.push({ code: "anonymity_not_allowed" });
    else if (input.anonymityUsesThisSession >= (config.directives?.anonymityUsesPerSession ?? 0)) {
      errors.push({ code: "anonymity_used_up" });
    }
  }
  return errors;
}

export function describeDirectiveError(err: DirectiveValidationError, type: RopDirectiveTypeDef | null): string {
  switch (err.code) {
    case "unknown_type":
      return "Unknown directive type.";
    case "missing_field":
      return `Missing required field: ${err.field}.`;
    case "too_long":
      return `Request is longer than ${err.max} characters.`;
    case "too_few_authors":
      return `${type?.label ?? "This directive"} needs at least ${err.min} delegates including you.`;
    case "too_many_authors":
      return `${type?.label ?? "This directive"} allows at most ${err.max} delegates including you.`;
    case "anonymity_not_allowed":
      return `${type?.label ?? "This directive"} cannot be anonymised.`;
    case "anonymity_used_up":
      return "Anonymity is already used for this crisis session.";
  }
}

export type DirectiveSubmitGate = {
  /** A crisis update is open (Q&A or pathway choice). */
  activeCrisis: boolean;
  /** Character has a status that blocks directives. */
  blockedByStatus: string | null;
  /** Committee session running. */
  sessionRunning: boolean;
  /** Marked as the day's final cabinet directive. */
  isFinal: boolean;
  /** Final directives already submitted today by this cabinet (excluding this one). */
  finalsThisDayForCabinet: number;
};

export function directiveSubmitBlocker(
  config: CommitteeRopConfig,
  type: RopDirectiveTypeDef,
  gate: DirectiveSubmitGate
): string | null {
  if (gate.blockedByStatus) return `Your character is ${gate.blockedByStatus} and cannot submit directives right now.`;
  if (type.submitWindow === "active_crisis" && !gate.activeCrisis) {
    return `${type.label}s can only be sent while a crisis update is active.`;
  }
  if (gate.isFinal) {
    const fin = config.directives?.finalDirective;
    if (!fin || fin.typeKey !== type.key) return "Only cabinet directives can be marked final.";
    if (gate.finalsThisDayForCabinet >= fin.perCabinetPerDay) {
      return "Your cabinet already sent its final directive for this crisis day.";
    }
  }
  return null;
}

export type DirectiveAction =
  | { kind: "submit"; signaturesComplete: boolean }
  | { kind: "signatures_complete" }
  | { kind: "recall" }
  | { kind: "withdraw" }
  | { kind: "review"; decision: "approved" | "approved_with_conditions" | "rejected" | "needs_revision" }
  | { kind: "present_to_floor" }
  | { kind: "floor_result"; passed: boolean }
  | { kind: "reopen" };

export type DirectiveTransition = { ok: true; status: RopDirectiveStatus } | { ok: false; error: string };

/** Directive state machine shared by server actions, UI, and tests. */
export function nextDirectiveStatus(
  type: RopDirectiveTypeDef,
  current: RopDirectiveStatus,
  action: DirectiveAction
): DirectiveTransition {
  const fail = (error: string): DirectiveTransition => ({ ok: false, error });
  switch (action.kind) {
    case "submit":
      if (!ROP_DIRECTIVE_EDITABLE.includes(current)) return fail("Only drafts can be submitted.");
      if (type.coAuthorsMustSign && !action.signaturesComplete) return { ok: true, status: "awaiting_signatures" };
      return { ok: true, status: "pending" };
    case "signatures_complete":
      if (current !== "awaiting_signatures") return fail("Not waiting for signatures.");
      return { ok: true, status: "pending" };
    case "recall":
      if (current !== "awaiting_signatures" && current !== "pending") return fail("Only waiting or pending directives can be recalled.");
      return { ok: true, status: "draft" };
    case "withdraw":
      if (current === "withdrawn" || current === "on_floor" || ROP_DIRECTIVE_DECIDED.includes(current)) {
        return fail("This directive can no longer be withdrawn.");
      }
      return { ok: true, status: "withdrawn" };
    case "review":
      if (current !== "pending") return fail("Only pending directives can be reviewed.");
      if (type.floorVote && (action.decision === "approved" || action.decision === "approved_with_conditions")) {
        return fail(`${type.label}s pass by floor vote — present it to the floor instead.`);
      }
      return { ok: true, status: action.decision };
    case "present_to_floor":
      if (!type.floorVote) return fail(`${type.label}s do not go to a floor vote.`);
      if (current !== "pending") return fail("Only pending directives can go to the floor.");
      return { ok: true, status: "on_floor" };
    case "floor_result":
      if (current !== "on_floor") return fail("This directive is not on the floor.");
      return { ok: true, status: action.passed ? "approved" : "rejected" };
    case "reopen":
      if (!ROP_DIRECTIVE_DECIDED.includes(current) && current !== "needs_revision") {
        return fail("Only decided directives can be reopened.");
      }
      return { ok: true, status: "pending" };
  }
}

/** Visible to a delegate who is not an author. */
export function directiveVisibleToCommittee(type: RopDirectiveTypeDef, status: RopDirectiveStatus): boolean {
  if (type.visibility !== "committee") return false;
  return status !== "draft" && status !== "awaiting_signatures" && status !== "withdrawn";
}
