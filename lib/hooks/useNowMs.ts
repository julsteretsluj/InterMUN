// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useSyncExternalStore } from "react";

let cacheMs = 0;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function emit() {
  cacheMs = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  // Always refresh on (re)subscribe. useSyncExternalStore may have already read a
  // stale getSnapshot during render; notify so Start/resume don't anchor on an old ms.
  cacheMs = Date.now();
  if (intervalId == null) {
    intervalId = setInterval(emit, 1000);
  }
  onStoreChange();
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
      // Drop the frozen tick so the next session cannot treat it as "fresh".
      cacheMs = 0;
    }
  };
}

function subscribeDisabled() {
  return () => {};
}

function getSnapshot() {
  return cacheMs;
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
