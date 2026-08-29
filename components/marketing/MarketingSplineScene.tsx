// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";
import { enableMarketingSplineControls, hideMarketingSplineWatermark } from "@/lib/marketing-spline-interaction";
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
}: {
  scene: string;
  className?: string;
  onLoad?: (app: Application) => void;
  /** Wait until the scene enters the viewport before mounting WebGL. */
  lazy?: boolean;
  /** @deprecated Slots removed — kept for call-site compatibility. */
  priority?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);

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

  return (
    <div ref={rootRef} className={cn("h-full w-full", className)}>
      {visible ? (
        <SplineErrorBoundary fallback={null}>
          <Spline
            scene={scene}
            className="h-full w-full"
            onLoad={(app) => {
              hideMarketingSplineWatermark(app);
              enableMarketingSplineControls(app);
              onLoad?.(app);
            }}
          />
        </SplineErrorBoundary>
      ) : null}
    </div>
  );
}
