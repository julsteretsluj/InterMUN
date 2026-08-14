// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GUIDED_TOUR_STEPS,
  guidedTourStorageKey,
  type GuidedTourView,
} from "@/lib/guided-tour";

type TourContextValue = {
  view: GuidedTourView;
  running: boolean;
  stepIndex: number;
  start: () => void;
  stop: (markDone?: boolean) => void;
  next: () => void;
  back: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used inside TourProvider");
  }
  return ctx;
}

export function useOptionalTour(): TourContextValue | null {
  return useContext(TourContext);
}

export function TourProvider({
  view,
  children,
}: {
  view: GuidedTourView;
  children: ReactNode;
}) {
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = GUIDED_TOUR_STEPS[view];

  const stop = useCallback(
    (markDone = true) => {
      setRunning(false);
      setStepIndex(0);
      if (markDone) {
        try {
          localStorage.setItem(guidedTourStorageKey(view), "done");
        } catch {
          /* ignore */
        }
      }
    },
    [view]
  );

  const start = useCallback(() => {
    setStepIndex(0);
    setRunning(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) {
        queueMicrotask(() => stop(true));
        return i;
      }
      return i + 1;
    });
  }, [steps.length, stop]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (running) root.dataset.tour = view;
    else delete root.dataset.tour;
    return () => {
      delete root.dataset.tour;
    };
  }, [running, view]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stop(true);
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, next, back, stop]);

  const value = useMemo(
    () => ({ view, running, stepIndex, start, stop, next, back }),
    [view, running, stepIndex, start, stop, next, back]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
