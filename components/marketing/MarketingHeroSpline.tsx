// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { MARKETING_HERO_SPLINE_SCENE } from "@/lib/marketing-spline-scenes";
import { MarketingSplineScene } from "@/components/marketing/MarketingSplineScene";
import { cn } from "@/lib/utils";

export function MarketingHeroSpline({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mun-marketing-hero-spline mun-marketing-hero-accent mun-marketing-spline-interactive",
        className
      )}
      role="group"
      aria-label="Interactive 3D preview — drag to change perspective"
    >
      <div className="mun-marketing-hero-spline-glass mun-apple-material mun-apple-material-thin">
        <div className="mun-marketing-hero-spline-inner">
          <MarketingSplineScene scene={MARKETING_HERO_SPLINE_SCENE} className="h-full w-full" lazy />
        </div>
        <span className="mun-marketing-hero-spline-shine" aria-hidden />
        <span className="mun-marketing-hero-spline-edge" aria-hidden />
        <span className="mun-marketing-spline-hint" aria-hidden>
          Drag to explore
        </span>
      </div>
    </div>
  );
}
