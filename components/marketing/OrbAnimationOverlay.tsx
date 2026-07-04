"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  OPENING_ORB_PATH,
  ORB_ANIMATION_FADE_MS,
  ORB_ANIMATION_HOLD_MS,
} from "@/lib/opening-orb";

type OrbPhase = "intro" | "fade" | "closed";

export function OrbAnimationOverlay({
  open,
  playKey,
  onComplete,
  phase: controlledPhase,
}: {
  open: boolean;
  /** Bump to restart the CSS breathe animation on each play. */
  playKey: number;
  onComplete: () => void;
  /** When set, fade timing is driven by the parent (e.g. marketing intro). */
  phase?: "intro" | "fade";
}) {
  const [phase, setPhase] = useState<OrbPhase>("closed");

  useEffect(() => {
    if (controlledPhase) {
      setPhase(controlledPhase);
      return;
    }

    if (!open) return;

    setPhase("intro");

    const fadeTimer = window.setTimeout(() => setPhase("fade"), ORB_ANIMATION_HOLD_MS);
    const doneTimer = window.setTimeout(() => {
      setPhase("closed");
      onComplete();
    }, ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, playKey, onComplete, controlledPhase]);

  useEffect(() => {
    if (!controlledPhase && phase === "closed" && !open) {
      document.body.style.overflow = "";
    }
  }, [phase, open, controlledPhase]);

  const visible = controlledPhase ? open : open && phase !== "closed";
  if (!visible && !controlledPhase) return null;
  if (controlledPhase && !open) return null;

  const fading = controlledPhase ? controlledPhase === "fade" : phase === "fade";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-700 ease-out",
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-hidden
    >
      <img
        key={playKey}
        src={OPENING_ORB_PATH}
        alt=""
        className="h-auto w-[min(92vw,28rem)] sm:w-[min(88vw,34rem)] md:w-[min(84vw,40rem)] lg:w-[min(78vw,48rem)]"
        decoding="async"
      />
    </div>
  );
}
