"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OrbAnimationOverlay } from "@/components/marketing/OrbAnimationOverlay";
import {
  markOpeningOrbSeen,
  ORB_ANIMATION_FADE_MS,
  ORB_ANIMATION_HOLD_MS,
  hasSeenOpeningOrb,
  preloadOpeningOrb,
} from "@/lib/opening-orb";

type IntroPhase = "checking" | "intro" | "fade" | "open";

/**
 * Full-screen opening orb on first visit per session (marketing + auth).
 * Session flag is written only after the animation completes so React Strict
 * Mode’s double effect invocation cannot skip playback.
 */
export function MarketingOpening({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("checking");
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let fadeTimer = 0;
    let openTimer = 0;

    const finish = () => {
      if (cancelled) return;
      markOpeningOrbSeen();
      setPhase("open");
      document.body.style.overflow = "";
    };

    const run = async () => {
      if (hasSeenOpeningOrb()) {
        setPhase("open");
        return;
      }

      await preloadOpeningOrb();
      if (cancelled) return;

      setPlayKey((key) => key + 1);
      setPhase("intro");
      document.body.style.overflow = "hidden";

      fadeTimer = window.setTimeout(() => {
        if (!cancelled) setPhase("fade");
      }, ORB_ANIMATION_HOLD_MS);

      openTimer = window.setTimeout(finish, ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS);
    };

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(fadeTimer);
      window.clearTimeout(openTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "checking") {
    return <div className="fixed inset-0 z-[9999] bg-black" aria-hidden />;
  }

  const overlayVisible = phase === "intro" || phase === "fade";

  return (
    <>
      {overlayVisible ? (
        <OrbAnimationOverlay
          open
          playKey={playKey}
          onComplete={() => {}}
          phase={phase === "fade" ? "fade" : "intro"}
        />
      ) : null}
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
