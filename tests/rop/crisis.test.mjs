// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { test } from "node:test";
import assert from "node:assert/strict";
import { FWC_SEAMUN_I_2027_ROP as FWC } from "../../lib/rop/fwc-seamun-i-2027.ts";
import {
  delegateSuccessStats,
  findCharacter,
  findFrequency,
  findPower,
  movementCheck,
  pathwayWinner,
  powerAvailability,
} from "../../lib/rop/crisis.ts";

const now = { crisisDay: 1, crisisSession: 2, modCaucusCount: 4 };
const use = (crisisDay, crisisSession, modCaucusIndex) => ({ crisisDay, crisisSession, modCaucusIndex });

test("all ten characters have a cabinet, powers and two meters", () => {
  assert.equal(FWC.crisis.characters.length, 10);
  for (const c of FWC.crisis.characters) {
    assert.ok(FWC.crisis.cabinets.some((cab) => cab.key === c.cabinet), c.country);
    assert.ok(c.powers.length >= 2, c.country);
    assert.equal(c.meters.length, 2, c.country);
    for (const p of c.powers) assert.ok(findFrequency(FWC, p.frequency), `${c.country}:${p.key}`);
  }
});

test("once per crisis day", () => {
  const f = findFrequency(FWC, "per_day");
  assert.equal(powerAvailability(f, [], now).ok, true);
  assert.equal(powerAvailability(f, [use(1, 1, 0)], now).ok, false);
  assert.equal(powerAvailability(f, [use(1, 1, 0)], { ...now, crisisDay: 2 }).ok, true);
});

test("up to 2 per crisis session", () => {
  const f = findFrequency(FWC, "session_x2");
  assert.equal(powerAvailability(f, [use(1, 2, 0)], now).remaining, 1);
  assert.equal(powerAvailability(f, [use(1, 2, 0), use(1, 2, 1)], now).ok, false);
  assert.equal(powerAvailability(f, [use(1, 1, 0), use(1, 1, 1)], now).ok, true);
});

test("once per 3 moderated caucuses", () => {
  const f = findFrequency(FWC, "per_three_mod");
  assert.equal(powerAvailability(f, [use(1, 1, 2)], now).ok, false);
  assert.equal(powerAvailability(f, [use(1, 1, 1)], now).ok, true);
});

test("simulation limits and Eleven's once-only ultimate", () => {
  const eleven = findCharacter(FWC, "Eleven (011/Jane Ives)");
  const ultimate = findPower(eleven, "memories_of_love");
  const f = findFrequency(FWC, ultimate.frequency);
  assert.equal(powerAvailability(f, [], now).ok, true);
  assert.equal(powerAvailability(f, [use(1, 1, 0)], { crisisDay: 2, crisisSession: 1, modCaucusCount: 9 }).ok, false);
  const twice = findFrequency(FWC, "simulation_x2");
  assert.equal(powerAvailability(twice, [use(1, 1, 0), use(2, 1, 5)], now).ok, false);
  assert.equal(powerAvailability(findFrequency(FWC, "unlimited"), [use(1, 2, 4), use(1, 2, 4)], now).ok, true);
});

test("movement: terrain cost vs MP pool, vehicle bonus on roads only", () => {
  const costs = { road_pavement: 1, forest_trees: 2, spore_cloud: 3, impassable: null };
  const vb = FWC.crisis.movement.vehicleBonusTerrain;
  const m = (terrain, spentMp) => movementCheck({ terrainCosts: costs, terrain, baseMp: 3, bonusMp: 2, spentMp, vehicleBonusTerrain: vb });
  assert.equal(m("road_pavement", 4).ok, true); // 3 + 2 bonus − 4 = 1
  assert.equal(m("forest_trees", 2).ok, false); // no bonus off-road, 1 left
  assert.equal(m("spore_cloud", 0).ok, true);
  assert.equal(m("impassable", 0).ok, false);
});

test("pathway plurality winner, ties go to the chair", () => {
  assert.equal(pathwayWinner([{ pathway_key: "a" }, { pathway_key: "b" }, { pathway_key: "a" }]).key, "a");
  assert.equal(pathwayWinner([{ pathway_key: "a" }, { pathway_key: "b" }]).key, null);
});

test("success statistics per delegate per day", () => {
  const { byDelegate } = delegateSuccessStats([
    { allocationIds: ["x"], status: "approved", crisisDay: 1 },
    { allocationIds: ["x", "y"], status: "approved_with_conditions", crisisDay: 1 },
    { allocationIds: ["x"], status: "rejected", crisisDay: 2 },
    { allocationIds: ["x"], status: "pending", crisisDay: 2 },
  ]);
  assert.equal(byDelegate.x.overall.submitted, 3);
  assert.equal(byDelegate.x.overall.rate, 0.5);
  assert.equal(byDelegate.x.byDay[1].rate, 0.75);
  assert.equal(byDelegate.x.byDay[2].rate, 0);
  assert.equal(byDelegate.y.overall.rate, 0.5);
});
