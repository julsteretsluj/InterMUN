"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const INTRO_SESSION_KEY = "intermun-marketing-intro-seen";
const OPENING_ORB_SRC = "/marketing/opening-orb.png";
const INTRO_HOLD_MS = 2800;
const INTRO_FADE_MS = 750;

type IntroPhase = "pending" | "intro" | "fade" | "open";

export function MarketingOpening({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("pending");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(INTRO_SESSION_KEY) === "1";

    if (reducedMotion || seen) {
      setPhase("open");
      return;
    }

    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    setPhase("intro");

    const fadeTimer = window.setTimeout(() => setPhase("fade"), INTRO_HOLD_MS);
    const openTimer = window.setTimeout(() => setPhase("open"), INTRO_HOLD_MS + INTRO_FADE_MS);

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
        <div
          className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-700 ease-out",
            phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
          )}
          aria-hidden
        >
          {phase !== "pending" ? (
            <img
              src={OPENING_ORB_SRC}
              alt=""
              className="marketing-orb-breathe h-auto w-[min(92vw,28rem)] sm:w-[min(88vw,34rem)] md:w-[min(84vw,40rem)] lg:w-[min(78vw,48rem)]"
              decoding="async"
            />
          ) : null}
        </div>
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
