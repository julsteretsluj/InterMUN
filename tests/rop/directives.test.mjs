// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { test } from "node:test";
import assert from "node:assert/strict";
import { FWC_SEAMUN_I_2027_ROP as FWC } from "../../lib/rop/fwc-seamun-i-2027.ts";
import {
  directiveSubmitBlocker,
  directiveVisibleToCommittee,
  findDirectiveType,
  nextDirectiveStatus,
  validateDirectiveForSubmit,
} from "../../lib/rop/directives.ts";

const full = {
  title: "Operation Mirror Shield",
  request: "Extract MKUltra logs from Sector B1.",
  characterPower: "Mind Mask",
  assets: "Getaway van, CB radios",
  resource: "Kali's crew provides cover.",
  reason: "Recover the original research logs.",
};

const codes = (errs) => errs.map((e) => (e.code === "missing_field" ? `missing:${e.field}` : e.code));

test("every RoP directive type is configured", () => {
  const keys = FWC.directives.types.map((t) => t.key);
  assert.deepEqual(keys, ["personal", "joint", "cabinet", "press_release", "rapid_crisis_action"]);
});

test("personal directive: exactly one author", () => {
  const v = (authorCount) =>
    codes(validateDirectiveForSubmit(FWC, { typeKey: "personal", fields: full, authorCount, anonymity: false, anonymityUsesThisSession: 0 }));
  assert.deepEqual(v(1), []);
  assert.deepEqual(v(2), ["too_many_authors"]);
});

test("joint directive: 2–5 delegates in total", () => {
  const v = (authorCount) =>
    codes(validateDirectiveForSubmit(FWC, { typeKey: "joint", fields: full, authorCount, anonymity: false, anonymityUsesThisSession: 0 }));
  assert.deepEqual(v(1), ["too_few_authors"]);
  assert.deepEqual(v(2), []);
  assert.deepEqual(v(5), []);
  assert.deepEqual(v(6), ["too_many_authors"]);
});

test("cabinet directive: sponsors required, no upper limit, never anonymous", () => {
  const v = (authorCount, anonymity = false) =>
    codes(validateDirectiveForSubmit(FWC, { typeKey: "cabinet", fields: full, authorCount, anonymity, anonymityUsesThisSession: 0 }));
  assert.deepEqual(v(1), ["too_few_authors"]);
  assert.deepEqual(v(9), []);
  assert.deepEqual(v(2, true), ["anonymity_not_allowed"]);
});

test("rapid crisis action cannot be anonymised and only during an active crisis", () => {
  const rapid = findDirectiveType(FWC, "rapid_crisis_action");
  assert.deepEqual(
    codes(validateDirectiveForSubmit(FWC, { typeKey: "rapid_crisis_action", fields: full, authorCount: 1, anonymity: true, anonymityUsesThisSession: 0 })),
    ["anonymity_not_allowed"]
  );
  const gate = { activeCrisis: false, blockedByStatus: null, sessionRunning: true, isFinal: false, finalsThisDayForCabinet: 0 };
  assert.match(directiveSubmitBlocker(FWC, rapid, gate), /active/);
  assert.equal(directiveSubmitBlocker(FWC, rapid, { ...gate, activeCrisis: true }), null);
});

test("required fields and length limit", () => {
  const errs = codes(
    validateDirectiveForSubmit(FWC, {
      typeKey: "personal",
      fields: { ...full, resource: " ", request: "x".repeat(2001) },
      authorCount: 1,
      anonymity: false,
      anonymityUsesThisSession: 0,
    })
  );
  assert.deepEqual(errs, ["missing:resource", "too_long"]);
});

test("anonymity: once per session", () => {
  const v = (uses) =>
    codes(validateDirectiveForSubmit(FWC, { typeKey: "press_release", fields: full, authorCount: 1, anonymity: true, anonymityUsesThisSession: uses }));
  assert.deepEqual(v(0), []);
  assert.deepEqual(v(1), ["anonymity_used_up"]);
});

test("blocking status and final cabinet directive limit", () => {
  const cabinet = findDirectiveType(FWC, "cabinet");
  const personal = findDirectiveType(FWC, "personal");
  const gate = { activeCrisis: false, blockedByStatus: null, sessionRunning: true, isFinal: false, finalsThisDayForCabinet: 0 };
  assert.match(directiveSubmitBlocker(FWC, personal, { ...gate, blockedByStatus: "paralysed" }), /paralysed/);
  assert.equal(directiveSubmitBlocker(FWC, cabinet, { ...gate, isFinal: true }), null);
  assert.match(directiveSubmitBlocker(FWC, cabinet, { ...gate, isFinal: true, finalsThisDayForCabinet: 1 }), /final/);
  assert.match(directiveSubmitBlocker(FWC, personal, { ...gate, isFinal: true }), /cabinet/);
});

test("status machine: personal directive review paths", () => {
  const t = findDirectiveType(FWC, "personal");
  assert.deepEqual(nextDirectiveStatus(t, "draft", { kind: "submit", signaturesComplete: true }), { ok: true, status: "pending" });
  for (const decision of ["approved", "approved_with_conditions", "rejected", "needs_revision"]) {
    assert.deepEqual(nextDirectiveStatus(t, "pending", { kind: "review", decision }), { ok: true, status: decision });
  }
  assert.equal(nextDirectiveStatus(t, "needs_revision", { kind: "submit", signaturesComplete: true }).status, "pending");
  assert.equal(nextDirectiveStatus(t, "approved", { kind: "review", decision: "rejected" }).ok, false);
  assert.equal(nextDirectiveStatus(t, "approved", { kind: "withdraw" }).ok, false);
  assert.equal(nextDirectiveStatus(t, "pending", { kind: "withdraw" }).status, "withdrawn");
  assert.equal(nextDirectiveStatus(t, "rejected", { kind: "reopen" }).status, "pending");
  assert.equal(nextDirectiveStatus(t, "pending", { kind: "present_to_floor" }).ok, false);
});

test("status machine: joint directive waits for co-signers", () => {
  const t = findDirectiveType(FWC, "joint");
  assert.equal(nextDirectiveStatus(t, "draft", { kind: "submit", signaturesComplete: false }).status, "awaiting_signatures");
  assert.equal(nextDirectiveStatus(t, "awaiting_signatures", { kind: "signatures_complete" }).status, "pending");
  assert.equal(nextDirectiveStatus(t, "awaiting_signatures", { kind: "recall" }).status, "draft");
});

test("status machine: cabinet directive passes only by floor vote", () => {
  const t = findDirectiveType(FWC, "cabinet");
  assert.equal(nextDirectiveStatus(t, "pending", { kind: "review", decision: "approved" }).ok, false);
  assert.equal(nextDirectiveStatus(t, "pending", { kind: "review", decision: "needs_revision" }).status, "needs_revision");
  assert.equal(nextDirectiveStatus(t, "pending", { kind: "present_to_floor" }).status, "on_floor");
  assert.equal(nextDirectiveStatus(t, "on_floor", { kind: "withdraw" }).ok, false);
  assert.equal(nextDirectiveStatus(t, "on_floor", { kind: "floor_result", passed: true }).status, "approved");
  assert.equal(nextDirectiveStatus(t, "on_floor", { kind: "floor_result", passed: false }).status, "rejected");
});

test("visibility: cabinet directives are public once submitted; personal never", () => {
  const cabinet = findDirectiveType(FWC, "cabinet");
  const personal = findDirectiveType(FWC, "personal");
  assert.equal(directiveVisibleToCommittee(cabinet, "draft"), false);
  assert.equal(directiveVisibleToCommittee(cabinet, "on_floor"), true);
  assert.equal(directiveVisibleToCommittee(personal, "approved"), false);
});
