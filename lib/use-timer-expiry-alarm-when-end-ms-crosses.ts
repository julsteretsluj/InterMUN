"use client";

import { useEffect, useRef } from "react";
import { playTimerExpiryAlarm } from "@/lib/timer-expiry-alarm";

/**
 * Fires the shared timer-expiry chime once when wall clock crosses `endMs`
 * (strictly positive remaining to zero or past). Requires `clockTick` to bump ~1/s while watching.
 */
export function useTimerExpiryAlarmWhenEndMsCrosses(params: {
  endMs: number | null;
  watch: boolean;
  clockTick: number;
}): void {
  const { endMs, watch, clockTick } = params;
  const hadPositiveRemainingRef = useRef(false);

  useEffect(() => {
    if (!watch || endMs == null || Number.isNaN(endMs)) {
      hadPositiveRemainingRef.current = false;
      return;
    }
    const remainingMs = endMs - Date.now();
    if (remainingMs > 0) {
      hadPositiveRemainingRef.current = true;
    } else if (hadPositiveRemainingRef.current) {
      playTimerExpiryAlarm();
      hadPositiveRemainingRef.current = false;
    }
  }, [watch, endMs, clockTick]);
}
