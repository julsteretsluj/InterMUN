// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { test } from "node:test";
import assert from "node:assert/strict";
import { FWC_SEAMUN_I_2027_ROP as FWC } from "../../lib/rop/fwc-seamun-i-2027.ts";
import {
  canDelegateRaiseMotion,
  didRopMotionPass,
  findRopMotion,
  missingMotionFields,
  motionAllowedInPhase,
  motionPassesUnopposed,
  requiredYesVotes,
  sortByRopPrecedence,
} from "../../lib/rop/procedure.ts";

const tally = (yes, present, members = present) => ({ yes, no: present - yes, present, members });

test("simple majority is 50% of present + 1 (literal RoP reading)", () => {
  assert.equal(requiredYesVotes(FWC.voting, "simple", 10), 6);
  assert.equal(requiredYesVotes(FWC.voting, "simple", 11), 7);
  assert.equal(requiredYesVotes(FWC.voting, "simple", 1), 2);
});

test("two-thirds is two-thirds of present + 1", () => {
  assert.equal(requiredYesVotes(FWC.voting, "2/3", 9), 7);
  assert.equal(requiredYesVotes(FWC.voting, "2/3", 10), 8);
});

test("more_than_fraction formula keeps classic behaviour", () => {
  const classic = { ...FWC.voting, formula: "more_than_fraction" };
  assert.equal(requiredYesVotes(classic, "simple", 10), 6);
  assert.equal(requiredYesVotes(classic, "simple", 11), 6);
  assert.equal(requiredYesVotes(classic, "2/3", 9), 7);
  assert.equal(requiredYesVotes(classic, "2/3", 10), 7);
});

test("zero present never passes", () => {
  assert.equal(didRopMotionPass(FWC, "moderated_caucus", "simple", tally(0, 0)), false);
});

test("set agenda needs two-thirds; caucus needs simple", () => {
  assert.equal(findRopMotion(FWC, "set_agenda").majority, "2/3");
  assert.equal(didRopMotionPass(FWC, "set_agenda", "simple", tally(7, 10)), false);
  assert.equal(didRopMotionPass(FWC, "set_agenda", "simple", tally(8, 10)), true);
  assert.equal(didRopMotionPass(FWC, "moderated_caucus", "simple", tally(6, 10)), true);
  assert.equal(didRopMotionPass(FWC, "moderated_caucus", "simple", tally(5, 10)), false);
});

test("cabinet directive counts the entire committee, not just present", () => {
  // 10 members, 6 present all yes: 6 < 10/2 + 1
  assert.equal(didRopMotionPass(FWC, "cabinet_directive", "simple", tally(6, 6, 10)), true);
  assert.equal(didRopMotionPass(FWC, "cabinet_directive", "simple", tally(5, 6, 10)), false);
});

test("precedence: suspend > adjourn > close debate > unmod > consultation > interrogation > moderated > admin", () => {
  const raised = [
    "set_agenda",
    "moderated_caucus",
    "interrogation",
    "consultation",
    "unmoderated_caucus",
    "close_debate",
    "adjourn",
    "suspend",
  ].map((code, i) => ({ procedure_code: code, created_at: new Date(2026, 0, 1, 0, i).toISOString() }));
  assert.deepEqual(
    sortByRopPrecedence(FWC, raised).map((r) => r.procedure_code),
    ["suspend", "adjourn", "close_debate", "unmoderated_caucus", "consultation", "interrogation", "moderated_caucus", "set_agenda"]
  );
});

test("equal precedence keeps raise order", () => {
  const rows = [
    { procedure_code: "exclude_public", created_at: "2026-01-01T00:02:00Z" },
    { procedure_code: "set_agenda", created_at: "2026-01-01T00:01:00Z" },
  ];
  assert.deepEqual(sortByRopPrecedence(FWC, rows).map((r) => r.procedure_code), ["set_agenda", "exclude_public"]);
});

test("motion field requirements", () => {
  const mod = findRopMotion(FWC, "moderated_caucus");
  assert.deepEqual(missingMotionFields(mod, { totalMinutes: 10 }), ["speakerSeconds", "topic"]);
  assert.deepEqual(missingMotionFields(mod, { totalMinutes: 10, speakerSeconds: 30, topic: "Lab breach" }), []);
  const interrogation = findRopMotion(FWC, "interrogation");
  assert.deepEqual(missingMotionFields(interrogation, { totalMinutes: 5 }), ["target"]);
});

test("voting-only and debate-only motions", () => {
  assert.equal(motionAllowedInPhase(findRopMotion(FWC, "roll_call_vote"), "debate"), false);
  assert.equal(motionAllowedInPhase(findRopMotion(FWC, "exclude_public"), "voting"), true);
  assert.equal(motionAllowedInPhase(findRopMotion(FWC, "unmoderated_caucus"), "voting"), false);
});

test("one motion per delegate per round, and unopposed auto-pass", () => {
  assert.equal(canDelegateRaiseMotion(FWC, 0), true);
  assert.equal(canDelegateRaiseMotion(FWC, 1), false);
  assert.equal(motionPassesUnopposed(FWC, 2, 0), true);
  assert.equal(motionPassesUnopposed(FWC, 1, 0), false);
  assert.equal(motionPassesUnopposed(FWC, 3, 1), false);
});

test("motions disallow abstention and GSL defaults to 60s", () => {
  assert.equal(FWC.motionRules.motionsAllowAbstain, false);
  assert.equal(FWC.speaking.gslSeconds, 60);
});
