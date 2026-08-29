// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MarketingHeroMacBookCanvas = dynamic(
  () =>
    import("@/components/marketing/MarketingHeroMacBookCanvas").then(
      (mod) => mod.MarketingHeroMacBookCanvas
    ),
  { ssr: false }
);

export function MarketingHeroSpline({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "mun-marketing-hero-spline mun-marketing-hero-accent mun-marketing-spline-interactive",
        className
      )}
      role="group"
      aria-label="Interactive 3D preview — drag to change perspective"
    >
      <div className="mun-marketing-hero-spline-glass mun-apple-material mun-apple-material-thin">
        <div className="mun-marketing-hero-spline-inner">
          {visible ? <MarketingHeroMacBookCanvas className="h-full w-full" /> : null}
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
