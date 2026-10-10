// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { test } from "node:test";
import assert from "node:assert/strict";
import { FWC_SEAMUN_I_2027_ROP as FWC } from "../../lib/rop/fwc-seamun-i-2027.ts";
import {
  formatHawkinsClock,
  msUntilNextInGameMinute,
  parseHawkinsTime,
  readHawkinsClock,
} from "../../lib/rop/hawkins-clock.ts";

const clock = FWC.crisis.clock;
const T0 = Date.parse("2027-01-16T01:00:00Z");
const min = (n) => n * 60_000;
const base = {
  sessionStartedAt: new Date(T0).toISOString(),
  clockSessionStartedAt: null,
  sessionBaseMinutes: null,
  overrideMinutes: null,
  overrideAt: null,
  paused: false,
  pausedMinutes: null,
  frozenMinutes: null,
  crisisDay: 1,
};

test("starts at midday on session start", () => {
  const r = readHawkinsClock(clock, base, T0);
  assert.equal(r.hhmm, "12:00");
  assert.equal(r.day, 1);
  assert.equal(r.running, true);
  assert.equal(r.blockLabel, "Afternoon");
});

test("6x rate: 10 real seconds = 1 in-game minute; 2 real hours = 12 in-game hours", () => {
  assert.equal(readHawkinsClock(clock, base, T0 + 10_000).hhmm, "12:01");
  assert.equal(readHawkinsClock(clock, base, T0 + 9_999).hhmm, "12:00");
  assert.equal(readHawkinsClock(clock, base, T0 + min(25)).hhmm, "14:30");
  const twoHours = readHawkinsClock(clock, base, T0 + min(120));
  assert.equal(twoHours.hhmm, "00:00");
  assert.equal(twoHours.day, 2);
});

test("rolls over midnight into Day 2", () => {
  const r = readHawkinsClock(clock, base, T0 + min(135)); // 12:00 + 13.5h
  assert.equal(formatHawkinsClock(r), "Day 2 · 01:30");
  assert.equal(r.blockLabel, "Night");
});

test("no session running: paused at 12:00 before first start, or at the frozen value", () => {
  const idle = readHawkinsClock(clock, { ...base, sessionStartedAt: null }, T0 + min(500));
  assert.equal(idle.hhmm, "12:00");
  assert.equal(idle.paused, true);
  assert.equal(idle.pauseReason, "no_session");
  const frozen = readHawkinsClock(clock, { ...base, sessionStartedAt: null, frozenMinutes: 17 * 60 + 42 }, T0);
  assert.equal(frozen.hhmm, "17:42");
});

test("default: each session restarts at midday, day follows the crisis day counter", () => {
  const r = readHawkinsClock(clock, { ...base, frozenMinutes: 20 * 60, crisisDay: 2 }, T0);
  assert.equal(formatHawkinsClock(r), "Day 2 · 12:00");
});

test("carry-over config resumes where the last session stopped", () => {
  const carry = { ...clock, carryOverBetweenSessions: true };
  const r = readHawkinsClock(carry, { ...base, frozenMinutes: 20 * 60 + 15, crisisDay: 3 }, T0 + 10_000);
  assert.equal(formatHawkinsClock(r), "20:16");
});

test("trigger-anchored base wins when it matches the live session", () => {
  const r = readHawkinsClock(
    clock,
    { ...base, clockSessionStartedAt: base.sessionStartedAt, sessionBaseMinutes: 8 * 60 },
    T0 + min(10)
  );
  assert.equal(r.hhmm, "09:00");
});

test("chair set-time offset applies from the moment it is set", () => {
  const setAt = T0 + min(30);
  const s = { ...base, overrideMinutes: 22 * 60, overrideAt: new Date(setAt).toISOString() };
  assert.equal(readHawkinsClock(clock, s, setAt).hhmm, "22:00");
  assert.equal(readHawkinsClock(clock, s, setAt + min(5)).hhmm, "22:30");
});

test("an override from a previous session is ignored", () => {
  const s = { ...base, overrideMinutes: 22 * 60, overrideAt: new Date(T0 - min(5)).toISOString() };
  assert.equal(readHawkinsClock(clock, s, T0).hhmm, "12:00");
});

test("chair pause holds the value", () => {
  const s = { ...base, paused: true, pausedMinutes: 15 * 60 + 5 };
  const r = readHawkinsClock(clock, s, T0 + min(60));
  assert.equal(r.hhmm, "15:05");
  assert.equal(r.pauseReason, "chair");
});

test("parse and tick helpers", () => {
  assert.equal(parseHawkinsTime("14:30"), 870);
  assert.equal(parseHawkinsTime("01:30", 2), 1440 + 90);
  assert.equal(parseHawkinsTime("25:00"), null);
  assert.equal(msUntilNextInGameMinute(clock, 720), 10_000);
  assert.equal(msUntilNextInGameMinute(clock, 720.5), 5_000);
});
