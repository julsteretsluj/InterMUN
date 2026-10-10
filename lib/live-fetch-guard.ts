// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Hard per-key rate limit for live REST reads (procedure_states / timers).
 *
 * A single tab once issued ~2.75 req/s per table for hours and took the database
 * down. Every REST refetch of those tables must go through `requestGuardedFetch`:
 * - one request in flight per key (callers share it)
 * - at least `minIntervalMs` between request starts
 * - exponential backoff (capped) after errors / timeouts
 * - extra requests inside the window collapse into one trailing request
 *
 * State lives on globalThis so duplicated module graphs share one budget.
 */

export const LIVE_FETCH_MIN_INTERVAL_MS = 3_000;
export const LIVE_FETCH_BACKOFF_BASE_MS = 5_000;
export const LIVE_FETCH_BACKOFF_MAX_MS = 120_000;

/** Resolve `true` on success, `false` on any error (including 504 timeouts). */
export type GuardedRun = () => Promise<boolean>;

type GuardState = {
  inFlight: Promise<void> | null;
  lastStartedAt: number;
  nextAllowedAt: number;
  failures: number;
  trailingTimer: ReturnType<typeof setTimeout> | null;
  trailingRun: GuardedRun | null;
  trailingWhen: (() => boolean) | null;
  started: number;
};

type GuardRegistry = {
  byKey: Map<string, GuardState>;
  now: () => number;
};

const REGISTRY_KEY = "__intermunLiveFetchGuard_v1";

function registry(): GuardRegistry {
  const g = globalThis as unknown as Record<string, GuardRegistry | undefined>;
  let reg = g[REGISTRY_KEY];
  if (!reg) {
    reg = { byKey: new Map(), now: () => Date.now() };
    g[REGISTRY_KEY] = reg;
  }
  return reg;
}

function stateFor(key: string): GuardState {
  const reg = registry();
  let state = reg.byKey.get(key);
  if (!state) {
    state = {
      inFlight: null,
      lastStartedAt: 0,
      nextAllowedAt: 0,
      failures: 0,
      trailingTimer: null,
      trailingRun: null,
      trailingWhen: null,
      started: 0,
    };
    reg.byKey.set(key, state);
  }
  return state;
}

export function liveFetchBackoffMs(failures: number): number {
  if (failures <= 0) return LIVE_FETCH_MIN_INTERVAL_MS;
  const exp = LIVE_FETCH_BACKOFF_BASE_MS * 2 ** Math.min(failures - 1, 10);
  return Math.min(LIVE_FETCH_BACKOFF_MAX_MS, exp);
}

function start(key: string, state: GuardState, run: GuardedRun): Promise<void> {
  const reg = registry();
  const startedAt = reg.now();
  state.lastStartedAt = startedAt;
  // Block re-entry until the request settles and sets the real window.
  state.nextAllowedAt = Number.POSITIVE_INFINITY;
  state.started += 1;
  const promise = Promise.resolve()
    .then(run)
    .catch(() => false)
    .then((ok) => {
      if (ok) {
        state.failures = 0;
        state.nextAllowedAt = startedAt + LIVE_FETCH_MIN_INTERVAL_MS;
      } else {
        state.failures += 1;
        state.nextAllowedAt = reg.now() + liveFetchBackoffMs(state.failures);
      }
    })
    .finally(() => {
      state.inFlight = null;
      if (state.trailingRun) scheduleTrailing(key, state);
    });
  state.inFlight = promise;
  return promise;
}

function scheduleTrailing(key: string, state: GuardState) {
  if (state.trailingTimer || state.inFlight) return;
  const delay = Math.max(0, state.nextAllowedAt - registry().now());
  state.trailingTimer = setTimeout(() => {
    state.trailingTimer = null;
    const run = state.trailingRun;
    const when = state.trailingWhen;
    state.trailingRun = null;
    state.trailingWhen = null;
    if (!run || (when && !when())) return;
    if (state.inFlight || registry().now() < state.nextAllowedAt) {
      state.trailingRun = run;
      state.trailingWhen = when;
      scheduleTrailing(key, state);
      return;
    }
    void start(key, state, run);
  }, delay);
}

/**
 * Run `run` now if the key's budget allows, otherwise share the in-flight request
 * and/or queue one trailing request at the earliest allowed time.
 *
 * `trailing` — when a request is already in flight, also queue one follow-up
 * (use after a local write so the reconcile read starts after the write).
 * `when` — checked before a deferred request fires; return false to drop it
 * (e.g. nobody is subscribed any more).
 */
export function requestGuardedFetch(
  key: string,
  run: GuardedRun,
  opts?: { trailing?: boolean; when?: () => boolean }
): Promise<void> {
  const state = stateFor(key);
  if (state.inFlight) {
    if (opts?.trailing) {
      state.trailingRun = run;
      state.trailingWhen = opts.when ?? null;
    }
    return state.inFlight;
  }
  if (registry().now() < state.nextAllowedAt) {
    state.trailingRun = run;
    state.trailingWhen = opts?.when ?? null;
    scheduleTrailing(key, state);
    return Promise.resolve();
  }
  return start(key, state, run);
}

/** Number of REST requests actually started per key (dev diagnostics / tests). */
export function liveFetchStartedCount(key: string): number {
  return registry().byKey.get(key)?.started ?? 0;
}

/** Test hook: swap the clock and clear all guard state. */
export function resetLiveFetchGuardForTests(now?: () => number) {
  const reg = registry();
  for (const state of reg.byKey.values()) {
    if (state.trailingTimer) clearTimeout(state.trailingTimer);
  }
  reg.byKey.clear();
  reg.now = now ?? (() => Date.now());
}
