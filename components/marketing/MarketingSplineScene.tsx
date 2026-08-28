// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import Spline from "@splinetool/react-spline/next";
import type { Application } from "@splinetool/runtime";
import { acquireSplineSceneSlot, releaseSplineSceneSlot } from "@/lib/marketing-spline-budget";
import { enableMarketingSplineControls } from "@/lib/marketing-spline-interaction";
import { cn } from "@/lib/utils";

class SplineErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function MarketingSplineScene({
  scene,
  className,
  onLoad,
  lazy = false,
  priority = false,
}: {
  scene: string;
  className?: string;
  onLoad?: (app: Application) => void;
  /** Wait until the scene enters the viewport before mounting WebGL. */
  lazy?: boolean;
  /** Reserve a scene slot immediately (for the floating clock). */
  priority?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const [slotReady, setSlotReady] = useState(false);

  useEffect(() => {
    if (!lazy || visible) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "140px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, visible]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let acquired = false;

    const claimSlot = async () => {
      if (!priority && typeof window !== "undefined" && "requestIdleCallback" in window) {
        await new Promise<void>((resolve) => window.requestIdleCallback(() => resolve()));
      }

      await acquireSplineSceneSlot();
      if (cancelled) {
        releaseSplineSceneSlot();
        return;
      }

      acquired = true;
      setSlotReady(true);
    };

    void claimSlot();

    return () => {
      cancelled = true;
      if (acquired) releaseSplineSceneSlot();
    };
  }, [visible, priority]);

  return (
    <div ref={rootRef} className={cn("h-full w-full", className)}>
      {visible && slotReady ? (
        <SplineErrorBoundary fallback={null}>
          <Spline
            scene={scene}
            className="h-full w-full"
            onLoad={(app) => {
              enableMarketingSplineControls(app);
              onLoad?.(app);
            }}
          />
        </SplineErrorBoundary>
      ) : null}
    </div>
  );
}
