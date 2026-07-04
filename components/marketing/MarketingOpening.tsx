"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { OrbAnimationOverlay } from "@/components/marketing/OrbAnimationOverlay";
import { ORB_ANIMATION_FADE_MS, ORB_ANIMATION_HOLD_MS } from "@/lib/opening-orb";

const INTRO_SESSION_KEY = "intermun-marketing-intro-seen";

type IntroPhase = "pending" | "intro" | "fade" | "open";

export function MarketingOpening({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("pending");
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(INTRO_SESSION_KEY) === "1";

    if (reducedMotion || seen) {
      setPhase("open");
      return;
    }

    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    setPlayKey(1);
    setPhase("intro");

    const fadeTimer = window.setTimeout(() => setPhase("fade"), ORB_ANIMATION_HOLD_MS);
    const openTimer = window.setTimeout(
      () => setPhase("open"),
      ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS
    );

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(openTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase === "open") {
      document.body.style.overflow = "";
    }
  }, [phase]);

  const overlayVisible = phase === "pending" || phase === "intro" || phase === "fade";

  return (
    <>
      {overlayVisible ? (
        <>
          {phase === "pending" ? (
            <div className="fixed inset-0 z-[200] bg-black" aria-hidden />
          ) : (
            <OrbAnimationOverlay
              open
              playKey={playKey}
              onComplete={() => {}}
              phase={phase === "fade" ? "fade" : "intro"}
            />
          )}
        </>
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
