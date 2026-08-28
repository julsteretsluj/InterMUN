// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { Application } from "@splinetool/runtime";
import Spline from "@splinetool/react-spline/next";
import { enableMarketingSplineControls } from "@/lib/marketing-spline-interaction";
import { cn } from "@/lib/utils";

export function MarketingSplineScene({
  scene,
  className,
  onLoad,
}: {
  scene: string;
  className?: string;
  onLoad?: (app: Application) => void;
}) {
  return (
    <Spline
      scene={scene}
      className={cn("mun-marketing-spline-canvas", className)}
      onLoad={(app) => {
        enableMarketingSplineControls(app);
        onLoad?.(app);
      }}
    />
  );
}
