// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OrbAnimationOverlay } from "@/components/marketing/OrbAnimationOverlay";
import {
  hasSeenOpeningOrb,
  markOpeningOrbSeen,
  preloadOpeningOrb,
} from "@/lib/opening-orb";

type IntroPhase = "checking" | "playing" | "open";

/**
 * Full-screen opening orb on first visit per session (marketing + auth).
 * Session flag is written only after the animation completes.
 */
export function MarketingOpening({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("checking");
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (hasSeenOpeningOrb()) {
        if (!cancelled) setPhase("open");
        return;
      }

      await preloadOpeningOrb();
      if (cancelled) return;

      setPlayKey((key) => key + 1);
      setPhase("playing");
    };

    void run();

    return () => {
      cancelled = true;
      document.body.style.overflow = "";
    };
  }, []);

  const handleComplete = () => {
    markOpeningOrbSeen();
    document.body.style.overflow = "";
    setPhase("open");
  };

  if (phase === "checking") {
    return <div className="fixed inset-0 z-[9999] bg-brand-cream [color-scheme:light]" aria-hidden />;
  }

  return (
    <>
      <OrbAnimationOverlay
        open={phase === "playing"}
        playKey={playKey}
        onComplete={handleComplete}
        surface="light"
      />
      <div
        className={cn(
          "transition-opacity duration-500",
          phase === "open" ? "opacity-100" : "opacity-0"
        )}
      >
        {children}
      </div>
    </>
  );
}
