// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

type Listener = (pending: boolean) => void;

const listeners = new Set<Listener>();
let pendingCount = 0;

function emit() {
  const pending = pendingCount > 0;
  for (const listener of listeners) listener(pending);
}

/** Mark a programmatic navigation / heavy transition as pending (pair with end). */
export function beginNavigationLoading() {
  pendingCount += 1;
  emit();
}

export function endNavigationLoading() {
  pendingCount = Math.max(0, pendingCount - 1);
  emit();
}

/** One-shot: begin now; end when the URL (or an explicit end) settles. */
export function markNavigationLoading() {
  beginNavigationLoading();
}

export function subscribeNavigationLoading(listener: Listener): () => void {
  listeners.add(listener);
  listener(pendingCount > 0);
  return () => {
    listeners.delete(listener);
  };
}

export function getNavigationLoadingPending() {
  return pendingCount > 0;
}
