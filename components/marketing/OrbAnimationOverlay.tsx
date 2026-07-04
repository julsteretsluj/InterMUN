"use client";

import { useEffect, useRef, useState } from "react";
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
  playKey: number;
  onComplete: () => void;
  phase?: "intro" | "fade";
}) {
  const [phase, setPhase] = useState<OrbPhase>("intro");
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (controlledPhase) {
      setPhase(controlledPhase);
      return;
    }

    if (!open) {
      setPhase("closed");
      return;
    }

    setPhase("intro");

    const fadeTimer = window.setTimeout(() => setPhase("fade"), ORB_ANIMATION_HOLD_MS);
    const doneTimer = window.setTimeout(() => {
      setPhase("closed");
      onCompleteRef.current();
    }, ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, playKey, controlledPhase]);

  useEffect(() => {
    if (!controlledPhase && phase === "closed" && !open) {
      document.body.style.overflow = "";
    }
  }, [phase, open, controlledPhase]);

  if (!open) return null;

  const fading = controlledPhase ? controlledPhase === "fade" : phase === "fade";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-700 ease-out",
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-hidden={fading}
    >
      <img
        key={playKey}
        src={OPENING_ORB_PATH}
        alt=""
        className="h-auto max-h-[min(90vh,90vw)] w-auto max-w-[min(92vw,44rem)] object-contain"
        decoding="sync"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}
