"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAllocationScoringPause } from "./ChairAllocationMatrixScoring";

export function ChairAllocationAutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();
  const pauseRefresh = useAllocationScoringPause();

  useEffect(() => {
    if (pauseRefresh) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs, pauseRefresh]);

  return (
    <p className="text-xs text-brand-muted mt-1 mb-3">
      Auto-refreshing requests every {Math.max(1, Math.round(intervalMs / 1000))}s.
    </p>
  );
}
