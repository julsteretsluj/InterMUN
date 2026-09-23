// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  openingOrbMp4Url,
  openingOrbPosterUrl,
  openingOrbUrl,
  ORB_ANIMATION_FADE_MS,
  ORB_ANIMATION_HOLD_MS,
} from "@/lib/opening-orb";

type OrbPhase = "loading" | "intro" | "fade" | "closed";

export function OrbAnimationOverlay({
  open,
  playKey,
  onComplete,
  surface = "light",
  dismissible = false,
  loops = 1,
}: {
  open: boolean;
  playKey: number;
  onComplete: () => void;
  surface?: "dark" | "light";
  dismissible?: boolean;
  loops?: number;
}) {
  const isLight = surface === "light";
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<OrbPhase>("closed");
  const [loopIndex, setLoopIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const timersRef = useRef<{ fade?: number; done?: number; advance?: number }>({});
  const loadGenerationRef = useRef(0);
  const playbackStartedRef = useRef(-1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loopIndexRef = useRef(0);
  const loopsRef = useRef(Math.max(1, loops));

  useEffect(() => {
    loopsRef.current = Math.max(1, loops);
  }, [loops]);

  useEffect(() => {
    loopIndexRef.current = loopIndex;
  }, [loopIndex]);

  const [prevPlayKey, setPrevPlayKey] = useState(playKey);
  if (playKey !== prevPlayKey) {
    setPrevPlayKey(playKey);
    setLoopIndex(0);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimers = useCallback(() => {
    if (timersRef.current.fade) window.clearTimeout(timersRef.current.fade);
    if (timersRef.current.done) window.clearTimeout(timersRef.current.done);
    if (timersRef.current.advance) window.clearTimeout(timersRef.current.advance);
    timersRef.current = {};
  }, []);

  const finishPlayback = useCallback(
    (generation: number) => {
      if (generation !== loadGenerationRef.current) return;
      clearTimers();
      setPhase("closed");
      document.body.style.overflow = "";
      onCompleteRef.current();
    },
    [clearTimers]
  );

  const startPlaybackTimers = useCallback(
    (generation: number, currentLoop: number) => {
      if (generation !== loadGenerationRef.current) return;

      clearTimers();
      setPhase("intro");

      timersRef.current.advance = window.setTimeout(() => {
        if (generation !== loadGenerationRef.current) return;

        const totalLoops = loopsRef.current;
        if (currentLoop + 1 < totalLoops) {
          playbackStartedRef.current = -1;
          setLoopIndex(currentLoop + 1);
          return;
        }

        setPhase("fade");
        timersRef.current.done = window.setTimeout(() => {
          finishPlayback(generation);
        }, ORB_ANIMATION_FADE_MS);
      }, ORB_ANIMATION_HOLD_MS);
    },
    [clearTimers, finishPlayback]
  );

  const dismissEarly = useCallback(() => {
    const generation = loadGenerationRef.current;
    setPhase("fade");
    window.setTimeout(() => finishPlayback(generation), ORB_ANIMATION_FADE_MS);
  }, [finishPlayback]);

  const [prevLoadKey, setPrevLoadKey] = useState<string | null>(null);
  const loadKeySignature = open ? `${playKey}:${loopIndex}` : null;
  if (loadKeySignature !== prevLoadKey) {
    setPrevLoadKey(loadKeySignature);
    if (loadKeySignature === null) {
      setPhase("closed");
      setLoopIndex(0);
    } else {
      setPhase("loading");
    }
  }

  useEffect(() => {
    if (!open) {
      clearTimers();
      loadGenerationRef.current += 1;
      playbackStartedRef.current = -1;
      return;
    }

    const generation = ++loadGenerationRef.current;
    playbackStartedRef.current = -1;
    clearTimers();
    document.body.style.overflow = "hidden";

    const video = videoRef.current;
    if (video) {
      try {
        video.currentTime = 0;
        void video.play().catch(() => {
          /* autoplay may be blocked until canplay */
        });
      } catch {
        /* ignore */
      }
    }

    return () => {
      clearTimers();
      document.body.style.overflow = "";
      if (generation === loadGenerationRef.current) {
        /* keep generation for next open */
      }
    };
  }, [open, playKey, loopIndex, clearTimers]);

  const handleCanPlay = useCallback(() => {
    const generation = loadGenerationRef.current;
    if (!open || playbackStartedRef.current === generation) return;
    playbackStartedRef.current = generation;
    const video = videoRef.current;
    if (video) {
      void video.play().catch(() => undefined);
    }
    startPlaybackTimers(generation, loopIndexRef.current);
  }, [open, startPlaybackTimers]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissEarly();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, dismissEarly]);

  if (!mounted || !open || phase === "closed") return null;

  const fading = phase === "fade";
  const webmSrc = openingOrbUrl(playKey * 100 + loopIndex);
  const mp4Src = openingOrbMp4Url(playKey * 100 + loopIndex);

  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity ease-out",
        isLight ? "bg-brand-cream [color-scheme:light]" : "bg-black",
        fading ? "pointer-events-none opacity-0 duration-[320ms]" : "opacity-100 duration-0",
        phase === "loading" && "opacity-100"
      )}
      aria-hidden={fading}
      aria-busy={phase === "loading"}
      role={dismissible ? "dialog" : undefined}
      aria-modal={dismissible || undefined}
    >
      {dismissible ? (
        <button
          type="button"
          onClick={dismissEarly}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-navy/15 bg-white/90 text-brand-navy shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clicky-blue)]"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      <video
        key={`${playKey}-${loopIndex}`}
        ref={videoRef}
        className={cn(
          "marketing-opening-orb object-contain object-center",
          isLight
            ? "h-[100dvh] w-[100dvw] max-h-[100dvh] max-w-[100dvw]"
            : "absolute inset-0 h-[100dvh] w-[100dvw] max-h-none max-w-none"
        )}
        poster={openingOrbPosterUrl()}
        muted
        playsInline
        preload="auto"
        onCanPlay={handleCanPlay}
        onLoadedData={handleCanPlay}
      >
        <source src={webmSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
      </video>
    </div>
  );

  return createPortal(overlay, document.body);
}
