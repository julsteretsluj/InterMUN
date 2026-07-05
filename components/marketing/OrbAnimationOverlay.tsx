"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  surface = "dark",
  dismissible = false,
}: {
  open: boolean;
  playKey: number;
  onComplete: () => void;
  /** Auto-intro uses dark full-screen; logo replay uses light. */
  surface?: "dark" | "light";
  /** Logo-triggered overlay — Escape / close button ends playback early. */
  dismissible?: boolean;
}) {
  const tClose = useTranslations("delegationNotes");
  const isLight = surface === "light";
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
    (generation: number) => {
      if (generation !== loadGenerationRef.current) return;

      clearTimers();
      setPhase("intro");

      timersRef.current.fade = window.setTimeout(() => {
        if (generation !== loadGenerationRef.current) return;
        setPhase("fade");
      }, ORB_ANIMATION_HOLD_MS);

      timersRef.current.done = window.setTimeout(() => {
        finishPlayback(generation);
      }, ORB_ANIMATION_HOLD_MS + ORB_ANIMATION_FADE_MS);
    },
    [clearTimers, finishPlayback]
  );

  const dismissEarly = useCallback(() => {
    const generation = loadGenerationRef.current;
    setPhase("fade");
    window.setTimeout(() => finishPlayback(generation), ORB_ANIMATION_FADE_MS);
  }, [finishPlayback]);

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

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissEarly();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, dismissEarly]);

  if (!open || phase === "closed") return null;

  const fading = phase === "fade";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity ease-out",
        isLight ? "bg-brand-cream [color-scheme:light]" : "bg-black",
        fading ? "pointer-events-none opacity-0 duration-[800ms]" : "opacity-100 duration-0",
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
        <img
          key={`${playKey}-${src}`}
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
}
