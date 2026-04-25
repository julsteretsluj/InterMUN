"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ChairAllocationAutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return (
    <p className="text-xs text-brand-muted mt-1 mb-3">
      Auto-refreshing requests every {Math.max(1, Math.round(intervalMs / 1000))}s.
    </p>
  );
}
