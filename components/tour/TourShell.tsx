// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { guidedTourStorageKey, type GuidedTourView } from "@/lib/guided-tour";
import { GuidedTourOverlay } from "@/components/tour/GuidedTourOverlay";
import { TourProvider, useOptionalTour, useTour } from "@/components/tour/tour-context";

function AutoStartTour() {
  const { view, start, running } = useTour();

  useEffect(() => {
    if (running) return;
    try {
      if (localStorage.getItem(guidedTourStorageKey(view)) === "done") return;
    } catch {
      return;
    }
    const id = window.setTimeout(() => start(), 700);
    return () => window.clearTimeout(id);
  }, [view, start, running]);

  return null;
}

export function TourShell({
  view,
  children,
}: {
  view: GuidedTourView;
  children: ReactNode;
}) {
  return (
    <TourProvider view={view}>
      {children}
      <AutoStartTour />
      <GuidedTourOverlay />
    </TourProvider>
  );
}

export function StartGuidedTourButton({ className }: { className?: string }) {
  const tour = useOptionalTour();
  const t = useTranslations("guidedTour.common");
  if (!tour) return null;
  const { start, running } = tour;
  return (
    <button
      type="button"
      onClick={() => start()}
      disabled={running}
      className={
        className ??
        "mt-4 inline-flex items-center rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition-apple hover:border-brand-accent/40 hover:bg-brand-accent/10 disabled:opacity-60"
      }
    >
      {t("replay")}
    </button>
  );
}
