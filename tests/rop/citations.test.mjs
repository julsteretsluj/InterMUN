// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { test } from "node:test";
import assert from "node:assert/strict";
import { FWC_SEAMUN_I_2027_ROP as FWC } from "../../lib/rop/fwc-seamun-i-2027.ts";
import {
  citationAuthors,
  citationSubmitter,
  directiveAssetOptions,
  directivePowerOptions,
  normalizeCitations,
  validateCitations,
} from "../../lib/rop/crisis.ts";

const hopper = { allocationId: "seat-hopper", country: "Jim Hopper" };
const joyce = { allocationId: "seat-joyce", country: "Joyce Byers" };
const counters = { crisisDay: 1, crisisSession: 1, modCaucusCount: 0 };
const type = (key) => FWC.directives.types.find((t) => t.key === key);

test("every character has assets in all three categories, with unique keys", () => {
  for (const c of FWC.crisis.characters) {
    for (const cat of ["property", "supplies", "allies"]) {
      assert.ok(c.assets.some((a) => a.category === cat), `${c.country}:${cat}`);
    }
    assert.equal(new Set(c.assets.map((a) => a.key)).size, c.assets.length, c.country);
    for (const p of c.powers) assert.ok(p.summary, `${c.country}:${p.key} summary`);
  }
});

test("options only list the acting character's own powers and assets", () => {
  const powers = directivePowerOptions(FWC, "personal", [hopper], {}, counters);
  const assets = directiveAssetOptions(FWC, [hopper]);
  assert.ok(powers.length > 0 && assets.length > 0);
  assert.ok(powers.every((p) => p.allocationId === hopper.allocationId));
  assert.ok(powers.some((p) => p.key === "municipal_intercept"));
  assert.ok(!powers.some((p) => p.key === "wall_of_lights"));
  assert.ok(assets.some((a) => a.label === "Chief's cruiser"));
  assert.ok(!assets.some((a) => a.label === "Christmas lights"));
});

test("power options follow each directive type's accepted power tags", () => {
  const brenner = { allocationId: "seat-brenner", country: "Dr. Martin Brenner" };
  const personal = directivePowerOptions(FWC, "personal", [brenner], {}, counters);
  assert.ok(!personal.some((p) => p.key === "federal_sanction"), "joint-only power hidden on personal");
  const joint = directivePowerOptions(FWC, "joint", [brenner], {}, counters);
  assert.ok(joint.some((p) => p.key === "federal_sanction"));
  assert.ok(joint.some((p) => p.key === "papas_authority"), "pooled types accept personal-tagged powers (RoP samples)");
  const pressRelease = directivePowerOptions(FWC, "press_release", [hopper], {}, counters);
  assert.ok(pressRelease.length > 0, "every character can back a press release");
  const rapid = directivePowerOptions(FWC, "rapid_crisis_action", [hopper], {}, counters);
  assert.ok(rapid.some((p) => p.key === "tactical_intervention"));
});

test("characters without a sheet get no options (empty dropdown)", () => {
  const ghost = { allocationId: "seat-x", country: "Head Chair" };
  assert.deepEqual(directivePowerOptions(FWC, "personal", [ghost], {}, counters), []);
  assert.deepEqual(directiveAssetOptions(FWC, [ghost]), []);
});

test("joint and cabinet directives pool co-authors' resources; personal ones don't", () => {
  assert.deepEqual(citationAuthors(type("personal"), hopper, [joyce]), [hopper]);
  assert.deepEqual(citationAuthors(type("joint"), hopper, [joyce, joyce]), [hopper, joyce]);
  assert.deepEqual(citationAuthors(type("cabinet"), hopper, [joyce]), [hopper, joyce]);
  const pooled = directivePowerOptions(FWC, "joint", [hopper, joyce], {}, counters);
  assert.ok(pooled.some((p) => p.allocationId === joyce.allocationId && p.key === "whistleblower_exposure"));
});

test("SMT previewing a seat cites that seat's character, not their own", () => {
  assert.equal(citationSubmitter({ ownSeat: null, actingSeat: joyce }), joyce);
  assert.equal(citationSubmitter({ ownSeat: hopper, actingSeat: joyce }), joyce);
  assert.equal(citationSubmitter({ ownSeat: hopper, actingSeat: null }), hopper);
  const submitter = citationSubmitter({ ownSeat: null, actingSeat: joyce });
  const powers = directivePowerOptions(FWC, "personal", citationAuthors(type("personal"), submitter, []), {}, counters);
  assert.ok(powers.every((p) => p.allocationId === joyce.allocationId));
  assert.ok(powers.some((p) => p.key === "wall_of_lights"));
});

test("server validation rejects powers and assets from another character", () => {
  const joyceAsset = directiveAssetOptions(FWC, [joyce])[0];
  const errors = validateCitations(FWC, {
    typeKey: "personal",
    authors: [hopper],
    powers: [
      { allocationId: hopper.allocationId, key: "wall_of_lights" },
      { allocationId: joyce.allocationId, key: "wall_of_lights" },
    ],
    assets: [{ allocationId: joyce.allocationId, key: joyceAsset.key }],
  });
  assert.deepEqual(
    errors.map((e) => e.code),
    ["foreign_power", "foreign_power", "foreign_asset"]
  );
});

test("server validation accepts own resources and pooled co-author resources", () => {
  const own = directiveAssetOptions(FWC, [hopper])[0];
  assert.deepEqual(
    validateCitations(FWC, {
      typeKey: "joint",
      authors: citationAuthors(type("joint"), hopper, [joyce]),
      powers: [{ allocationId: joyce.allocationId, key: "whistleblower_exposure" }],
      assets: [{ allocationId: hopper.allocationId, key: own.key }],
    }),
    []
  );
});

test("a power on the wrong directive type is rejected", () => {
  const errors = validateCitations(FWC, {
    typeKey: "personal",
    authors: [{ allocationId: "seat-brenner", country: "Dr. Martin Brenner" }],
    powers: [{ allocationId: "seat-brenner", key: "federal_sanction" }],
    assets: [],
  });
  assert.equal(errors[0]?.code, "power_wrong_type");
});

test("consumption: a spent power drops out of the options and fails submit-time validation", () => {
  const uses = { [hopper.allocationId]: { municipal_intercept: [{ crisisDay: 1, crisisSession: 1, modCaucusIndex: 0 }] } };
  const before = directivePowerOptions(FWC, "personal", [hopper], {}, counters).find((p) => p.key === "municipal_intercept");
  assert.equal(before.available, true);
  assert.equal(before.remaining, 1);
  const after = directivePowerOptions(FWC, "personal", [hopper], uses, counters).find((p) => p.key === "municipal_intercept");
  assert.equal(after.available, false);
  assert.ok(after.reason);

  const input = {
    typeKey: "personal",
    authors: [hopper],
    powers: [{ allocationId: hopper.allocationId, key: "municipal_intercept" }],
    assets: [],
    usesByAllocation: uses,
    counters,
  };
  assert.deepEqual(validateCitations(FWC, input), [], "drafts don't check availability");
  assert.equal(validateCitations(FWC, { ...input, checkAvailability: true })[0]?.code, "power_unavailable");

  const nextDay = { ...counters, crisisDay: 2 };
  assert.equal(directivePowerOptions(FWC, "personal", [hopper], uses, nextDay).find((p) => p.key === "municipal_intercept").available, true);
});

test("normalizeCitations accepts db and client shapes and drops junk/duplicates", () => {
  assert.deepEqual(
    normalizeCitations([
      { allocation_id: "a", key: "x" },
      { allocationId: "a", key: "x" },
      { allocationId: "b" },
      null,
      { allocationId: "b", key: "y" },
    ]),
    [
      { allocationId: "a", key: "x" },
      { allocationId: "b", key: "y" },
    ]
  );
  assert.deepEqual(normalizeCitations("nope"), []);
});
