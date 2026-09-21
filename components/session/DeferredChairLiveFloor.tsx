// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChairLiveFloorThemed = dynamic(
  () =>
    import("@/components/session/ChairLiveFloorThemed").then((m) => m.ChairLiveFloorThemed),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-11 animate-pulse rounded-[var(--radius-md)] bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]"
        aria-hidden
      />
    ),
  }
);

/**
 * Defers the live floor bar (realtime + multi-query) until after first paint so
 * chair navigations are not blocked by floor hydration.
 */
export function DeferredChairLiveFloor(props: {
  conferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  observeFloorOnly?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (typeof requestIdleCallback === "function") {
      idleId = requestIdleCallback(enable, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(enable, 200);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) {
    return (
      <div
        className="h-11 animate-pulse rounded-[var(--radius-md)] bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]"
        aria-hidden
      />
    );
  }

  return <ChairLiveFloorThemed {...props} />;
}
