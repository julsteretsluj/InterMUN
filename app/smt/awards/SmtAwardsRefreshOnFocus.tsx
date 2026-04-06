"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * When SMT returns to this tab after chairs save nominations elsewhere,
 * refresh the RSC payload so the nominations table shows new rows immediately.
 */
export function SmtAwardsRefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [router]);
  return null;
}
