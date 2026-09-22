"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAllocationScoringPause } from "./ChairAllocationMatrixScoring";

export function ChairAllocationAutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();
  const pauseRefresh = useAllocationScoringPause();

  useEffect(() => {
    if (pauseRefresh) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs, pauseRefresh]);

  return (
    <p className="text-xs text-brand-muted mt-1 mb-3">
      Auto-refreshing while this tab is visible (every {Math.max(1, Math.round(intervalMs / 1000))}s).
    </p>
  );
}
