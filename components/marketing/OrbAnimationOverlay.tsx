// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SyntheticEvent } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  surface = "light",
  dismissible = false,
  loops = 1,
}: {
  open: boolean;
  playKey: number;
  onComplete: () => void;
  /** Full-screen backdrop behind the GIF (default light cream). */
  surface?: "dark" | "light";
  /** Logo-triggered overlay — Escape / close button ends playback early. */
  dismissible?: boolean;
  /** Full GIF loops to show before fade (click replay uses 2). */
  loops?: number;
}) {
  const tClose = useTranslations("delegationNotes");
  const isLight = surface === "light";
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<OrbPhase>("closed");
  const [src, setSrc] = useState<string | null>(null);
  const [loopIndex, setLoopIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const timersRef = useRef<{ fade?: number; done?: number; advance?: number }>({});
  const loadGenerationRef = useRef(0);
  const playbackStartedRef = useRef(-1);
  const activeSrcRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loopIndexRef = useRef(0);
  const loopsRef = useRef(Math.max(1, loops));

  useEffect(() => {
    loopsRef.current = Math.max(1, loops);
  }, [loops]);

  useEffect(() => {
    loopIndexRef.current = loopIndex;
  }, [loopIndex]);

  // Restart the loop counter when a new play is requested (adjust state during render).
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
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      activeSrcRef.current = null;
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

  // State transitions for open/close and per-loop reloads happen during render;
  // the effect below only handles imperative work (timers, fetch, object URLs, DOM).
  const [prevLoadKey, setPrevLoadKey] = useState<string | null>(null);
  const loadKeySignature = open ? `${playKey}:${loopIndex}` : null;
  if (loadKeySignature !== prevLoadKey) {
    setPrevLoadKey(loadKeySignature);
    if (loadKeySignature === null) {
      setPhase("closed");
      setSrc(null);
      setLoopIndex(0);
    } else {
      setPhase("loading");
      setSrc(null);
    }
  }

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
      return;
    }

    const generation = ++loadGenerationRef.current;
    playbackStartedRef.current = -1;
    let cancelled = false;

    clearTimers();
    activeSrcRef.current = null;
    document.body.style.overflow = "hidden";

    const loadKey = playKey * 100 + loopIndex;

    const load = async () => {
      try {
        const nextUrl = await loadOpeningOrbObjectUrl(loadKey);
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
        const fallback = openingOrbUrl(loadKey);
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
  }, [open, playKey, loopIndex, clearTimers]);

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
        startPlaybackTimers(generation, loopIndexRef.current);
      })();
    },
    [open, startPlaybackTimers]
  );

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

  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity ease-out",
        isLight ? "bg-brand-cream [color-scheme:light]" : "bg-black",
        fading ? "pointer-events-none opacity-0 duration-500" : "opacity-100 duration-0",
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
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-navy/15 bg-white/90 text-brand-navy shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label={tClose("close")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- plays a blob object URL (GIF); next/image cannot optimize blob URLs
        <img
          key={`${playKey}-${loopIndex}-${src}`}
          src={src}
          alt=""
          onLoad={handleImageLoad}
          className={cn(
            "marketing-opening-orb object-contain object-center",
            isLight
              ? "h-[100dvh] w-[100dvw] max-h-[100dvh] max-w-[100dvw]"
              : "absolute inset-0 h-[100dvh] w-[100dvw] max-h-none max-w-none"
          )}
          decoding="sync"
          loading="eager"
          fetchPriority="high"
        />
      ) : null}
    </div>
  );

  return createPortal(overlay, document.body);
}
