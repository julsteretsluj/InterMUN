"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  loadOpeningOrbObjectUrl,
  openingOrbUrl,
  ORB_ANIMATION_FADE_MS,
  ORB_ANIMATION_HOLD_MS,
} from "@/lib/opening-orb";

type OrbPhase = "loading" | "intro" | "fade" | "closed";

export function OrbAnimationOverlay({
  open,
  playKey,
  onComplete,
}: {
  open: boolean;
  playKey: number;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<OrbPhase>("closed");
  const [src, setSrc] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const timersRef = useRef<{ fade?: number; done?: number }>({});
  const startedForKeyRef = useRef(-1);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimers = () => {
    if (timersRef.current.fade) window.clearTimeout(timersRef.current.fade);
    if (timersRef.current.done) window.clearTimeout(timersRef.current.done);
    timersRef.current = {};
  };

  useEffect(() => {
    if (!open) {
      clearTimers();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      startedForKeyRef.current = -1;
      setPhase("closed");
      setSrc(null);
      return;
    }

    let cancelled = false;

    clearTimers();
    setPhase("loading");
    setSrc(null);
    document.body.style.overflow = "hidden";

    const load = async () => {
      try {
        const nextUrl = await loadOpeningOrbObjectUrl(playKey);
        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = nextUrl;
        setSrc(nextUrl);
      } catch {
        if (cancelled) return;
        setSrc(openingOrbUrl(playKey));
      }
    };

    void load();

    return () => {
      cancelled = true;
      clearTimers();
      document.body.style.overflow = "";
    };
  }, [open, playKey]);

  const handleImageLoad = () => {
    if (!open || startedForKeyRef.current === playKey) return;
    startedForKeyRef.current = playKey;

    clearTimers();
    setPhase("intro");

    timersRef.current.fade = window.setTimeout(() => {
      setPhase("fade");
    }, ORB_ANIMATION_HOLD_MS);

    timersRef.current.done = window.setTimeout(() => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPhase("closed");
      document.body.style.overflow = "";
      onCompleteRef.current();
    }, ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS);
  };

  if (!open || phase === "closed") return null;

  const fading = phase === "fade";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] overflow-hidden bg-black transition-opacity duration-700 ease-out",
        phase === "loading" ? "opacity-100" : fading ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-hidden={fading}
      aria-busy={phase === "loading"}
    >
      {src ? (
        <img
          key={`${playKey}-${src}`}
          src={src}
          alt=""
          onLoad={handleImageLoad}
          className="marketing-opening-orb absolute inset-0 h-[100dvh] w-[100dvw] max-h-none max-w-none object-contain object-center"
          decoding="async"
          loading="eager"
          fetchPriority="high"
        />
      ) : null}
    </div>
  );
}
