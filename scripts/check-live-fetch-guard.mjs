// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

// Run: node --experimental-strip-types --test scripts/check-live-fetch-guard.mjs
// Proves procedure_states / timers REST reads stay bounded per conference.

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_FETCH_BACKOFF_MAX_MS,
  LIVE_FETCH_MIN_INTERVAL_MS,
  liveFetchStartedCount,
  requestGuardedFetch,
  resetLiveFetchGuardForTests,
} from "../lib/live-fetch-guard.ts";

const KEY = "procedure:conf-1";
const HOUR_MS = 3_600_000;

async function flush() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function setup() {
  // Clear pending guard timers while the previous mock clock still owns them.
  resetLiveFetchGuardForTests(() => Date.now());
  mock.timers.reset();
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
}

async function hammer(run, stepMs, opts) {
  for (let ms = 0; ms < HOUR_MS; ms += stepMs) {
    void requestGuardedFetch(KEY, run, opts);
    await flush();
    mock.timers.tick(stepMs);
    await flush();
  }
  return liveFetchStartedCount(KEY);
}

test("9 Oct storm cadence (one read per ~360ms round trip) is capped per window", async () => {
  setup();
  const started = await hammer(async () => true, 360, { trailing: true });
  const bound = Math.ceil(HOUR_MS / LIVE_FETCH_MIN_INTERVAL_MS) + 1;
  assert.ok(started <= bound, `started ${started} > bound ${bound}`);
});

test("acquire/release churn on every render stays at one request per window", async () => {
  setup();
  const started = await hammer(async () => true, 250);
  const bound = Math.ceil(HOUR_MS / LIVE_FETCH_MIN_INTERVAL_MS) + 1;
  assert.ok(started <= bound, `started ${started} > bound ${bound}`);
});

test("errors back off exponentially up to the cap", async () => {
  setup();
  const started = await hammer(async () => false, 100, { trailing: true });
  // 5s, 10s, 20s, 40s, 80s, then every 120s — roughly 35 requests an hour.
  const bound = Math.ceil(HOUR_MS / LIVE_FETCH_BACKOFF_MAX_MS) + 8;
  assert.ok(started <= bound, `started ${started} > bound ${bound}`);
});

test("thrown errors and hung requests share one in-flight slot", async () => {
  setup();
  let resolveHung = () => {};
  const hung = () => new Promise((r) => (resolveHung = r));
  void requestGuardedFetch(KEY, hung);
  for (let i = 0; i < 1000; i += 1) void requestGuardedFetch(KEY, hung, { trailing: true });
  await flush();
  assert.equal(liveFetchStartedCount(KEY), 1);
  resolveHung(false);
  await flush();
  mock.timers.tick(4_999);
  await flush();
  assert.equal(liveFetchStartedCount(KEY), 1);
  mock.timers.tick(1);
  await flush();
  assert.equal(liveFetchStartedCount(KEY), 2);
});

test("a post-write refresh still lands after the window", async () => {
  setup();
  let calls = 0;
  const run = async () => {
    calls += 1;
    return true;
  };
  await requestGuardedFetch(KEY, run);
  await requestGuardedFetch(KEY, run, { trailing: true });
  assert.equal(calls, 1);
  mock.timers.tick(LIVE_FETCH_MIN_INTERVAL_MS);
  await flush();
  assert.equal(calls, 2);
});

test("deferred request is dropped once nobody is subscribed", async () => {
  setup();
  let subscribed = true;
  const run = async () => true;
  await requestGuardedFetch(KEY, run);
  void requestGuardedFetch(KEY, run, { trailing: true, when: () => subscribed });
  subscribed = false;
  mock.timers.tick(LIVE_FETCH_MIN_INTERVAL_MS * 2);
  await flush();
  assert.equal(liveFetchStartedCount(KEY), 1);
});
