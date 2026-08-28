// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useRef, useState } from "react";
import { MarketingSplineScene } from "@/components/marketing/MarketingSplineScene";
import { MARKETING_GLASS_ORB_SPLINE_SCENE } from "@/lib/marketing-spline-scenes";
import { cn } from "@/lib/utils";

const ORB_SIZE_CLASS = {
  sm: "mun-marketing-glass-orb--sm",
  md: "mun-marketing-glass-orb--md",
  lg: "mun-marketing-glass-orb--lg",
  xl: "mun-marketing-glass-orb--xl",
} as const;

export function MarketingGlassOrb({
  placement,
  size = "md",
  delay,
  interactive = true,
}: {
  placement: string;
  size?: keyof typeof ORB_SIZE_CLASS;
  delay?: 1 | 2 | 3;
  interactive?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldRenderScene, setShouldRenderScene] = useState(false);
  const hasSplineScene = MARKETING_GLASS_ORB_SPLINE_SCENE.length > 0;

  useEffect(() => {
    if (!hasSplineScene) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRenderScene(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasSplineScene]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "mun-marketing-glass-orb",
        ORB_SIZE_CLASS[size],
        placement,
        delay === 1 && "mun-animate-delay-1",
        delay === 2 && "mun-animate-delay-2",
        delay === 3 && "mun-animate-delay-3",
        interactive && hasSplineScene && "mun-marketing-spline-interactive"
      )}
      aria-hidden
    >
      <div className="mun-marketing-glass-orb-shell mun-apple-material mun-apple-material-ultrathin">
        {hasSplineScene && shouldRenderScene ? (
          <MarketingSplineScene scene={MARKETING_GLASS_ORB_SPLINE_SCENE} className="h-full w-full" />
        ) : (
          <span className="mun-marketing-glass-orb-fallback" />
        )}
        <span className="mun-marketing-glass-orb-shine" />
      </div>
    </div>
  );
}
