// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Image from "next/image";
import { useState } from "react";
import { MARKETING_ORIGIN_GLOBE_SPLINE_SCENE } from "@/lib/marketing-spline-scenes";
import { MarketingSplineScene } from "@/components/marketing/MarketingSplineScene";
import { cn } from "@/lib/utils";

export function MarketingOriginGlobe({ className }: { className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const hasSplineScene = MARKETING_ORIGIN_GLOBE_SPLINE_SCENE.length > 0;

  return (
    <div
      className={cn("mun-marketing-origin-globe mun-marketing-spline-interactive", className)}
      role="group"
      aria-label="Interactive globe — drag to change perspective"
    >
      <div className="mun-marketing-origin-globe-glass mun-apple-material mun-apple-material-thin">
        <div className="mun-marketing-origin-globe-inner">
          {!hasSplineScene || !loaded ? (
            <Image
              src="/marketing/globe.png"
              alt=""
              width={679}
              height={944}
              aria-hidden
              className={cn(
                "mx-auto h-full w-full object-contain transition-opacity duration-500",
                hasSplineScene && loaded ? "opacity-0" : "opacity-100"
              )}
            />
          ) : null}

          {hasSplineScene ? (
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                loaded ? "opacity-100" : "opacity-0"
              )}
            >
              <MarketingSplineScene
                scene={MARKETING_ORIGIN_GLOBE_SPLINE_SCENE}
                className="h-full w-full"
                onLoad={() => setLoaded(true)}
              />
            </div>
          ) : null}

          {!hasSplineScene || !loaded ? (
            <span className="mun-marketing-origin-globe-loading" aria-hidden>
              {hasSplineScene ? "Loading…" : null}
            </span>
          ) : null}
        </div>
        <span className="mun-marketing-origin-globe-shine" aria-hidden />
        <span className="mun-marketing-origin-globe-edge" aria-hidden />
        {hasSplineScene ? (
          <span className="mun-marketing-spline-hint" aria-hidden>
            Drag to explore
          </span>
        ) : null}
      </div>
    </div>
  );
}
