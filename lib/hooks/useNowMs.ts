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
  if (intervalId == null) {
    cacheMs = Date.now();
    intervalId = setInterval(emit, 1000);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
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
