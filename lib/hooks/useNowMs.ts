// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useSyncExternalStore } from "react";

type NowMsStore = {
  cacheMs: number;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
};

/** Shared across duplicate module evaluations (same Next/webpack pitfall as the timer store). */
function getNowMsStore(): NowMsStore {
  const g = globalThis as typeof globalThis & { __intermunNowMsStore?: NowMsStore };
  if (!g.__intermunNowMsStore) {
    g.__intermunNowMsStore = {
      cacheMs: 0,
      listeners: new Set(),
      intervalId: null,
    };
  }
  return g.__intermunNowMsStore;
}

function emit() {
  const store = getNowMsStore();
  store.cacheMs = Date.now();
  store.listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  const store = getNowMsStore();
  store.listeners.add(onStoreChange);
  // Refresh on (re)subscribe so Start/resume don't anchor on an old ms.
  // Do not call onStoreChange synchronously — React forbids that in subscribe.
  store.cacheMs = Date.now();
  if (store.intervalId == null) {
    store.intervalId = setInterval(emit, 1000);
  }
  return () => {
    store.listeners.delete(onStoreChange);
    if (store.listeners.size === 0 && store.intervalId != null) {
      clearInterval(store.intervalId);
      store.intervalId = null;
      // Drop the frozen tick so the next session cannot treat it as "fresh".
      store.cacheMs = 0;
    }
  };
}

function subscribeDisabled() {
  return () => {};
}

function getSnapshot() {
  return getNowMsStore().cacheMs;
}

function getServerSnapshot() {
  return 0;
}

/** Shared 1s wall-clock store for live timers (safe for React Compiler). */
export function useNowMs(enabled: boolean): number {
  const ms = useSyncExternalStore(
    enabled ? subscribe : subscribeDisabled,
    getSnapshot,
    getServerSnapshot
  );
  return enabled ? ms : 0;
}
