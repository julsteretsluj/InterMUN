// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useState } from "react";

/**
 * Per-action busy flags so one slow write does not disable unrelated controls.
 */
export function useActionBusy<K extends string>() {
  const [counts, setCounts] = useState<Partial<Record<K, number>>>({});

  const runBusy = useCallback((key: K, fn: () => Promise<void>) => {
    setCounts((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
    void (async () => {
      try {
        await fn();
      } finally {
        setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 1) - 1) }));
      }
    })();
  }, []);

  const isBusy = useCallback((key: K) => (counts[key] ?? 0) > 0, [counts]);

  return { runBusy, isBusy };
}
