// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { MARKETING_CLOCK_SPLINE_SCENE } from "@/lib/marketing-spline-scenes";
import { MarketingSplineScene } from "@/components/marketing/MarketingSplineScene";
import { cn } from "@/lib/utils";

export function MarketingClockSpline({ className }: { className?: string }) {
  return (
    <aside
      className={cn("mun-marketing-clock mun-marketing-spline-interactive", className)}
      aria-label="Conference clock"
    >
      <div className="mun-marketing-clock-glass mun-apple-material mun-apple-material-thin">
        <div className="mun-marketing-clock-inner">
          <MarketingSplineScene
            scene={MARKETING_CLOCK_SPLINE_SCENE}
            className="h-full w-full"
            priority
          />
        </div>
        <span className="mun-marketing-clock-shine" aria-hidden />
        <span className="mun-marketing-clock-edge" aria-hidden />
      </div>
    </aside>
  );
}
