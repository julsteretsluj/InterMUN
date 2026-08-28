// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Spline from "@splinetool/react-spline/next";
import { MARKETING_HERO_SPLINE_SCENE } from "@/lib/marketing-spline-scenes";
import { cn } from "@/lib/utils";

const HERO_SPLINE_SCENE = MARKETING_HERO_SPLINE_SCENE;

export function MarketingHeroSpline({ className }: { className?: string }) {
  return (
    <div className={cn("mun-marketing-hero-spline mun-marketing-hero-accent", className)} aria-hidden>
      <div className="mun-marketing-hero-spline-glass mun-apple-material mun-apple-material-thin">
        <div className="mun-marketing-hero-spline-inner">
          <Spline scene={HERO_SPLINE_SCENE} className="h-full w-full" />
        </div>
        <span className="mun-marketing-hero-spline-shine" aria-hidden />
        <span className="mun-marketing-hero-spline-edge" aria-hidden />
      </div>
    </div>
  );
}
