"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import {
  loadOpeningOrbObjectUrl,
  openingOrbUrl,
  ORB_ANIMATION_FADE_MS,
  ORB_ANIMATION_HOLD_MS,
} from "@/lib/opening-orb";

type OrbPhase = "loading" | "intro" | "fade" | "closed";

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

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
  const loadGenerationRef = useRef(0);
  const playbackStartedRef = useRef(-1);
  const activeSrcRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimers = useCallback(() => {
    if (timersRef.current.fade) window.clearTimeout(timersRef.current.fade);
    if (timersRef.current.done) window.clearTimeout(timersRef.current.done);
    timersRef.current = {};
  }, []);

  const startPlaybackTimers = useCallback(
    (generation: number) => {
      if (generation !== loadGenerationRef.current) return;

      clearTimers();
      setPhase("intro");

      timersRef.current.fade = window.setTimeout(() => {
        if (generation !== loadGenerationRef.current) return;
        setPhase("fade");
      }, ORB_ANIMATION_HOLD_MS);

      timersRef.current.done = window.setTimeout(() => {
        if (generation !== loadGenerationRef.current) return;
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        activeSrcRef.current = null;
        setPhase("closed");
        document.body.style.overflow = "";
        onCompleteRef.current();
      }, ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS);
    },
    [clearTimers]
  );

  useEffect(() => {
    if (!open) {
      clearTimers();
      loadGenerationRef.current += 1;
      playbackStartedRef.current = -1;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      activeSrcRef.current = null;
      setPhase("closed");
      setSrc(null);
      return;
    }

    const generation = ++loadGenerationRef.current;
    playbackStartedRef.current = -1;
    let cancelled = false;

    clearTimers();
    setPhase("loading");
    setSrc(null);
    activeSrcRef.current = null;
    document.body.style.overflow = "hidden";

    const load = async () => {
      try {
        const nextUrl = await loadOpeningOrbObjectUrl(playKey);
        if (cancelled || generation !== loadGenerationRef.current) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = nextUrl;
        activeSrcRef.current = nextUrl;
        setSrc(nextUrl);
      } catch {
        if (cancelled || generation !== loadGenerationRef.current) return;
        const fallback = openingOrbUrl(playKey);
        activeSrcRef.current = fallback;
        setSrc(fallback);
      }
    };

    void load();

    return () => {
      cancelled = true;
      clearTimers();
      document.body.style.overflow = "";
    };
  }, [open, playKey, clearTimers]);

  const handleImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const generation = loadGenerationRef.current;
      if (!open || playbackStartedRef.current === generation) return;

      const img = event.currentTarget;
      const loadedSrc = img.currentSrc || img.src;
      if (!loadedSrc || loadedSrc !== activeSrcRef.current) return;

      void (async () => {
        try {
          if (img.decode) await img.decode();
        } catch {
          /* decode unsupported or failed — still attempt playback */
        }

        if (!open || generation !== loadGenerationRef.current) return;
        if (loadedSrc !== activeSrcRef.current) return;
        if (playbackStartedRef.current === generation) return;

        await waitForNextPaint();

        if (!open || generation !== loadGenerationRef.current) return;
        if (loadedSrc !== activeSrcRef.current) return;
        if (playbackStartedRef.current === generation) return;

        playbackStartedRef.current = generation;
        startPlaybackTimers(generation);
      })();
    },
    [open, startPlaybackTimers]
  );

  if (!open || phase === "closed") return null;

  const fading = phase === "fade";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] overflow-hidden bg-black transition-opacity ease-out",
        fading ? "pointer-events-none opacity-0 duration-[800ms]" : "opacity-100 duration-0",
        phase === "loading" && "opacity-100"
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
          decoding="sync"
          loading="eager"
          fetchPriority="high"
        />
      ) : null}
    </div>
  );
}
